// Configuración global
const PREGUNTAS_POR_PAGINA = 50;
let preguntas = [];
let preguntasAleatorias = [];
let paginaActual = 1;
let totalPaginas = 1;
let respuestasUsuario = {};

// Cargar preguntas desde JSON
async function cargarPreguntas() {
    try {
        const response = await fetch('preguntas.json');
        preguntas = await response.json();
        return preguntas;
    } catch (error) {
        console.error('Error cargando preguntas:', error);
        return [];
    }
}

// Preparar preguntas aleatorias
function prepararPreguntas() {
    const randomSeed = localStorage.getItem('randomSeed') || Math.floor(Math.random() * 1000000);
    localStorage.setItem('randomSeed', randomSeed);
    
    // Clonar y mezclar preguntas
    preguntasAleatorias = [...preguntas];
    mezclarArray(preguntasAleatorias, randomSeed);
    
    // Procesar cada pregunta
    preguntasAleatorias.forEach((p, index) => {
        const textosOpciones = [];
        p.opciones.forEach(opcion => {
            Object.values(opcion).forEach(texto => textosOpciones.push(texto));
        });

        // Encontrar respuesta correcta
        let respuestaLetraCorrecta = null;
        p.opciones.forEach(opcion => {
            for (const [letra, texto] of Object.entries(opcion)) {
                if (texto === p.respuesta) {
                    respuestaLetraCorrecta = letra;
                    break;
                }
            }
        });

        // Mezclar opciones
        mezclarArray(textosOpciones, randomSeed + index);

        p.opciones_procesadas = [
            { letra: "A", texto: textosOpciones[0] },
            { letra: "B", texto: textosOpciones[1] },
            { letra: "C", texto: textosOpciones[2] },
            { letra: "D", texto: textosOpciones[3] }
        ];

        p.indice = index;
        p.respuesta_letra_correcta = respuestaLetraCorrecta;
        p.respuesta_texto_correcto = p.respuesta;
    });

    totalPaginas = Math.ceil(preguntasAleatorias.length / PREGUNTAS_POR_PAGINA);
    return preguntasAleatorias;
}

// Función para mezclar arrays con seed
function mezclarArray(array, seed) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Cargar progreso guardado
function cargarProgreso() {
    const guardado = localStorage.getItem('respuestasUsuario');
    if (guardado) {
        respuestasUsuario = JSON.parse(guardado);
    }
}

// Guardar progreso
function guardarProgreso() {
    localStorage.setItem('respuestasUsuario', JSON.stringify(respuestasUsuario));
}

// Mostrar preguntas en la página actual
function mostrarPreguntas() {
    const inicio = (paginaActual - 1) * PREGUNTAS_POR_PAGINA;
    const fin = inicio + PREGUNTAS_POR_PAGINA;
    const preguntasPagina = preguntasAleatorias.slice(inicio, fin);
    
    const container = document.getElementById('preguntasContainer');
    container.innerHTML = '';
    
    preguntasPagina.forEach((p, index) => {
        const preguntaIndexGlobal = inicio + index;
        const respuestaGuardada = respuestasUsuario[`pregunta_${p.indice}`];
        
        const preguntaHTML = `
            <div class="pregunta ${respuestaGuardada ? 'pregunta-respondida' : 'pregunta-sin-responder'}" 
                 id="pregunta-${p.indice}" 
                 data-pregunta-index="${preguntaIndexGlobal}">
                <strong>${preguntaIndexGlobal + 1}. ${p.enunciado}</strong>
                <p><em>${p.conector}</em></p>
                
                ${p.opciones_procesadas.map(opcion => `
                    <div class="opcion">
                        <input type="radio" 
                               name="pregunta_${p.indice}" 
                               value="${opcion.letra}"
                               id="p${p.indice}_${opcion.letra}"
                               ${respuestaGuardada === opcion.letra ? 'checked' : ''}>
                        <label for="p${p.indice}_${opcion.letra}">
                            <strong>${opcion.letra}:</strong> ${opcion.texto}
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML += preguntaHTML;
    });
    
    // Actualizar contadores
    document.getElementById('progresoTexto').textContent = `Página ${paginaActual} de ${totalPaginas}`;
    document.getElementById('contadorPreguntas').textContent = 
        `Preguntas ${inicio + 1} - ${Math.min(fin, preguntasAleatorias.length)} de ${preguntasAleatorias.length}`;
    
    // Configurar event listeners para las respuestas
    configurarEventListeners();
}

function configurarEventListeners() {
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const preguntaDiv = this.closest('.pregunta');
            preguntaDiv.classList.remove('pregunta-sin-responder');
            preguntaDiv.classList.add('pregunta-respondida');
            
            // Guardar respuesta
            const nombrePregunta = this.name;
            respuestasUsuario[nombrePregunta] = this.value;
            guardarProgreso();
            
            mostrarFeedbackGuardado();
            actualizarContador();
        });
    });
}

function mostrarFeedbackGuardado() {
    const indicator = document.getElementById('autoSaveIndicator');
    indicator.classList.add('mostrar');
    setTimeout(() => indicator.classList.remove('mostrar'), 2000);
}

function actualizarContador() {
    const respondidas = Object.keys(respuestasUsuario).length;
    console.log(`Preguntas respondidas: ${respondidas}/${preguntasAleatorias.length}`);
}

// Navegación
function siguientePagina() {
    if (paginaActual < totalPaginas) {
        paginaActual++;
        mostrarPreguntas();
    }
}

function anteriorPagina() {
    if (paginaActual > 1) {
        paginaActual--;
        mostrarPreguntas();
    }
}

function finalizarExamen() {
    // Calcular resultados
    let puntaje = 0;
    let preguntasRespondidas = 0;
    const resultados = [];

    preguntasAleatorias.forEach(p => {
        const respuestaUsuario = respuestasUsuario[`pregunta_${p.indice}`];
        let respuestaUsuarioTexto = "No respondida";
        let acierto = false;

        if (respuestaUsuario) {
            preguntasRespondidas++;
            for (const opcion of p.opciones_procesadas) {
                if (opcion.letra === respuestaUsuario) {
                    respuestaUsuarioTexto = opcion.texto;
                    break;
                }
            }
            
            if (respuestaUsuarioTexto === p.respuesta_texto_correcto) {
                puntaje++;
                acierto = true;
            }
        }

        resultados.push({
            pregunta: p.enunciado,
            conector: p.conector,
            respuesta_usuario: respuestaUsuarioTexto,
            respuesta_correcta: p.respuesta_texto_correcto,
            acierto: acierto
        });
    });

    // Guardar resultados para la página de resultados
    localStorage.setItem('resultadosExamen', JSON.stringify({
        resultados: resultados,
        puntaje: puntaje,
        total: preguntasAleatorias.length,
        respondidas: preguntasRespondidas
    }));

    // Limpiar datos temporales
    localStorage.removeItem('respuestasUsuario');
    localStorage.removeItem('randomSeed');

    // Redirigir a resultados
    window.location.href = 'resultados.html';
}

// Inicializar examen
async function inicializarExamen() {
    await cargarPreguntas();
    prepararPreguntas();
    cargarProgreso();
    mostrarPreguntas();
    
    // Configurar botones de navegación
    document.getElementById('btnAnterior').addEventListener('click', anteriorPagina);
    document.getElementById('btnSiguiente').addEventListener('click', siguientePagina);
    document.getElementById('btnFinalizar').addEventListener('click', finalizarExamen);
}

// Verificar autenticación
function verificarAutenticacion() {
    if (localStorage.getItem('loggedIn') !== 'true') {
        window.location.href = 'index.html';
    }
}