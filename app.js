// --- URLs del Script ---
const URL_CONECTION = "https://script.google.com/macros/s/AKfycbxJ2Ce-RodJaJPL2xinczMCZGXtj0zzwfOxwhvr0BCZZTtXNFDt26lIUGBd9hdhS-M/exec";

const GET_CARTERAS_URL = URL_CONECTION + "?accion=getWalletsStructured";
const GET_RULES_URL = URL_CONECTION + "?accion=getAutomationRules";
const POST_URL = URL_CONECTION + "?accion=addTransaction";

// --- Elementos del DOM ---
const loadingScreen = document.getElementById('loading-screen'); // <--- NUEVO
const form = document.getElementById('transaction-form');
const statusMessage = document.getElementById('status-message');
const submitButton = document.getElementById('submit-button');
const hojaSelect = document.getElementById('hoja');       
const carteraSelect = document.getElementById('cartera'); 
const conceptoInput = document.getElementById('concepto'); 
const listaConceptos = document.getElementById('lista-conceptos'); 
const cantidadInput = document.getElementById('cantidad'); 

let datosGlobales = {};       
let reglasAutomatizacion = {}; 

// --- FUNCION 1: Cargar Datos Iniciales ---
async function cargarDatosIniciales() {
    try {
        // Petición simultánea
        const [resCarteras, resReglas] = await Promise.all([
            fetch(GET_CARTERAS_URL),
            fetch(GET_RULES_URL)
        ]);

        if (!resCarteras.ok || !resReglas.ok) throw new Error("Error en la conexión");

        datosGlobales = await resCarteras.json();
        reglasAutomatizacion = await resReglas.json();
        
        console.log("Datos cargados OK");

        // Llenar Select de CUENTAS
        hojaSelect.innerHTML = '';
        Object.keys(datosGlobales).forEach(cuenta => {
            const option = document.createElement('option');
            option.value = cuenta;
            option.textContent = cuenta; 
            hojaSelect.appendChild(option);
        });

        // Disparar actualización inicial
        actualizarSelectCarteras();

        // --- AQUÍ LEVANTAMOS LA PANTALLA DE CARGA ---
        // Agregamos un pequeño delay artificial (500ms) para que la animación se aprecie 
        // si el internet es demasiado rápido, se ve elegante.
        setTimeout(() => {
            loadingScreen.classList.add('oculto');
            // Habilitamos el scroll de nuevo
            document.body.style.overflow = 'auto';
        }, 500);

    } catch (error) {
        console.error('Error al cargar datos:', error);
        
        // Si hay error, cambiamos el texto de la carga para avisar
        document.querySelector('.loader-text').textContent = "Error de conexión :(";
        document.querySelector('.loader-text').style.color = "red";
        document.querySelector('.loader-icon').style.display = "none"; // Ocultar icono
    }
}

// --- FUNCION 2: Actualizar Carteras ---
function actualizarSelectCarteras() {
    const cuentaSeleccionada = hojaSelect.value;
    const listaCarteras = datosGlobales[cuentaSeleccionada] || [];

    carteraSelect.innerHTML = '';

    listaCarteras.forEach(nombreCartera => {
        const option = document.createElement('option');
        option.value = nombreCartera;
        option.textContent = nombreCartera;
        carteraSelect.appendChild(option);
    });

    actualizarSugerenciasConceptos();
}

// --- FUNCION 3: Sugerencias ---
function actualizarSugerenciasConceptos() {
    const carteraActual = carteraSelect.value;
    
    listaConceptos.innerHTML = '';
    conceptoInput.value = ''; 
    desbloquearCantidad();    

    const reglasDeCartera = reglasAutomatizacion[carteraActual];

    if (reglasDeCartera) {
        const nombresReglas = Object.keys(reglasDeCartera);
        nombresReglas.forEach(nombre => {
            const option = document.createElement('option');
            option.value = nombre; 
            listaConceptos.appendChild(option);
        });
    }
}

// --- FUNCION 4: Verificar Regla ---
function verificarReglaAutomatizacion() {
    const carteraActual = carteraSelect.value;
    const conceptoEscrito = conceptoInput.value;
    
    if (reglasAutomatizacion[carteraActual] && reglasAutomatizacion[carteraActual][conceptoEscrito]) {
        
        const pasos = reglasAutomatizacion[carteraActual][conceptoEscrito];
        
        if (pasos.length > 0) {
            const primerPaso = pasos[0];
            const cantidadRegla = primerPaso.cantidad;

            if (cantidadRegla !== "x" && cantidadRegla !== "X") {
                cantidadInput.value = cantidadRegla;
                cantidadInput.readOnly = true; 
                cantidadInput.style.opacity = "0.5"; 
                statusMessage.textContent = "Automatización detectada: Cantidad fija.";
                statusMessage.className = "success";
            } else {
                desbloquearCantidad();
            }
        }
    } else {
        desbloquearCantidad();
    }
}

function desbloquearCantidad() {
    cantidadInput.readOnly = false;
    cantidadInput.style.opacity = "1";
    statusMessage.textContent = "";
}

// --- LISTENERS ---
hojaSelect.addEventListener('change', actualizarSelectCarteras);
carteraSelect.addEventListener('change', actualizarSugerenciasConceptos);
conceptoInput.addEventListener('input', verificarReglaAutomatizacion);

// --- ENVIO ---
form.addEventListener('submit', event => {
    event.preventDefault(); 
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";
    
    const formData = new FormData(form);
    const data = {
        hoja: formData.get('hoja'),
        cartera: formData.get('cartera'),
        tipo: formData.get('tipo'),
        concepto: formData.get('concepto'),
        cantidad: parseFloat(formData.get('cantidad'))
    };

    fetch(POST_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Enviado:', response);
        statusMessage.textContent = "¡Transacción registrada con éxito!";
        statusMessage.className = "success";
        form.reset(); 
        
        setTimeout(() => {
            actualizarSelectCarteras();
            desbloquearCantidad();
        }, 10);
    })
    .catch(error => {
        console.error('Error:', error);
        statusMessage.textContent = "Error al registrar.";
        statusMessage.className = "error";
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Registrar";
    });
});

// --- INICIO ---
document.addEventListener('DOMContentLoaded', cargarDatosIniciales);