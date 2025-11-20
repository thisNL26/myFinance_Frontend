// --- URLs del Script ---
const URL_CONECTION = "https://script.google.com/macros/s/AKfycbxJ2Ce-RodJaJPL2xinczMCZGXtj0zzwfOxwhvr0BCZZTtXNFDt26lIUGBd9hdhS-M/exec";

const GET_CARTERAS_URL = URL_CONECTION + "?accion=getWalletsStructured";
const GET_RULES_URL = URL_CONECTION + "?accion=getAutomationRules";
const GET_SUMMARY_URL = URL_CONECTION + "?accion=getAccountSummaryData"; 
const POST_URL = URL_CONECTION + "?accion=addTransaction";

// --- Elementos DOM ---
const loadingScreen = document.getElementById('loading-screen');
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

// --- INICIO ---
document.addEventListener('DOMContentLoaded', cargarDatosIniciales);

async function cargarDatosIniciales() {
    try {
        const [resCarteras, resReglas] = await Promise.all([
            fetch(GET_CARTERAS_URL),
            fetch(GET_RULES_URL)
        ]);

        if (!resCarteras.ok || !resReglas.ok) throw new Error("Error conectando con el Script");

        datosGlobales = await resCarteras.json();
        reglasAutomatizacion = await resReglas.json();
        
        hojaSelect.innerHTML = '';
        if (datosGlobales && typeof datosGlobales === 'object') {
            Object.keys(datosGlobales).forEach(cuenta => {
                const option = document.createElement('option');
                option.value = cuenta;
                option.textContent = cuenta; 
                hojaSelect.appendChild(option);
            });
            actualizarSelectCarteras();
        }

        setTimeout(() => {
            if(loadingScreen) loadingScreen.classList.add('oculto');
        }, 500);

    } catch (error) {
        console.error('Error inicial:', error);
        const loaderText = document.querySelector('.loader-text');
        if(loaderText) {
            loaderText.textContent = "Error: Verifica la URL del Script";
            loaderText.style.color = "red";
        }
    }
}

// --- NAVEGACIÓN ---
window.cambiarVista = function(vistaNombre) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const view = document.getElementById(`view-${vistaNombre}`);
    if(view) view.classList.add('active');
    
    const botones = document.querySelectorAll('.nav-btn');
    if(botones.length > 0) {
        if(vistaNombre === 'registro') botones[0].classList.add('active');
        else botones[1].classList.add('active');
    }

    if (vistaNombre === 'resumen') {
        cargarResumen();
    }
}

// --- FUNCIONES FORMULARIO ---
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

function actualizarSugerenciasConceptos() {
    const carteraActual = carteraSelect.value;
    listaConceptos.innerHTML = '';
    conceptoInput.value = ''; 
    desbloquearCantidad();    
    const reglasDeCartera = reglasAutomatizacion[carteraActual];
    if (reglasDeCartera) {
        Object.keys(reglasDeCartera).forEach(nombre => {
            const option = document.createElement('option');
            option.value = nombre; 
            listaConceptos.appendChild(option);
        });
    }
}

function verificarReglaAutomatizacion() {
    const carteraActual = carteraSelect.value;
    const conceptoEscrito = conceptoInput.value;
    if (reglasAutomatizacion[carteraActual] && reglasAutomatizacion[carteraActual][conceptoEscrito]) {
        const pasos = reglasAutomatizacion[carteraActual][conceptoEscrito];
        if (pasos.length > 0) {
            const cantidadRegla = pasos[0].cantidad;
            if (cantidadRegla !== "x" && cantidadRegla !== "X") {
                cantidadInput.value = cantidadRegla;
                cantidadInput.readOnly = true; 
                cantidadInput.style.opacity = "0.5"; 
                statusMessage.textContent = "Automatización detectada: Cantidad fija.";
                statusMessage.className = "success";
            } else { desbloquearCantidad(); }
        }
    } else { desbloquearCantidad(); }
}

function desbloquearCantidad() {
    cantidadInput.readOnly = false;
    cantidadInput.style.opacity = "1";
    statusMessage.textContent = "";
}

hojaSelect.addEventListener('change', actualizarSelectCarteras);
carteraSelect.addEventListener('change', actualizarSugerenciasConceptos);
conceptoInput.addEventListener('input', verificarReglaAutomatizacion);

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
    .then(() => {
        statusMessage.textContent = "¡Registrado con éxito!";
        statusMessage.className = "success";
        form.reset(); 
        setTimeout(() => {
            actualizarSelectCarteras();
            desbloquearCantidad();
        }, 10);
    })
    .catch(error => {
        statusMessage.textContent = "Error al registrar.";
        statusMessage.className = "error";
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Registrar";
    });
});

// --- VISUALIZACIÓN D3 (RESUMEN) ---

window.cargarResumen = async function() {
    const container = document.getElementById('d3-container');
    container.innerHTML = '<div style="display:flex; height:100%; justify-content:center; align-items:center; color:#888;">Cargando gráfico...</div>';

    try {
        const response = await fetch(GET_SUMMARY_URL);
        console.log("Response Status:", response.status);
        
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const rawData = await response.json(); 
        if (!Array.isArray(rawData)) throw new Error("El backend no devolvió una lista válida.");
        
        container.innerHTML = ''; 
        const graphData = procesarDatosParaD3(rawData);
        renderizarGrafico(graphData);

    } catch (error) {
        console.error("Error en cargarResumen:", error);
        container.innerHTML = `<p style="color:#F44336; text-align:center; padding-top:50%;">Error: ${error.message}</p>`;
    }
}

function procesarDatosParaD3(rawData) {
    const dataMap = {};
    rawData.forEach(item => { if(Array.isArray(item) && item.length >= 2) dataMap[item[0]] = item[1]; });

    const nodes = [];
    const links = [];
    
    function addNode(id, label, group, fx, fy) {
        const val = dataMap[id] !== undefined ? dataMap[id] : 0;
        nodes.push({ id, label, value: val, group, fx, fy });
    }

    function addLink(sourceId, targetId, colorGroup) {
        links.push({ source: sourceId, target: targetId, colorGroup });
    }

    // --- CONFIGURACIÓN DE POSICIONES ---
    const CENTER_X = 380; // Eje central del diagrama
    
    // 1. IZQUIERDA: Entradas Generales
    addNode("Total Entradas", "TOTAL ENTRADAS", 4, 80, 275); // Justo en medio verticalmente (550/2)

    // 2. CENTRO: BLOQUE DIGITAL (Despliega hacia abajo desde BBVA)
    addNode("BBVA", "BBVA", 3, CENTER_X, 60); // Cabeza
    // Ramificaciones
    addNode("NU", "NU", 3, CENTER_X - 100, 140); 
    addNode("Open Bank", "Open Bank", 3, CENTER_X, 140); 
    addNode("Mercado Pago", "Mercado Pago", 3, CENTER_X + 100, 140); 

    // 3. CENTRO: SUMAS (En medio de los dos bloques)
    // Estos nodos flotan en el centro para separar Digital de Efectivo
    addNode("Total Gastos", "Total Gastos", "middle-sum", CENTER_X - 120, 275);
    addNode("Total Gustos", "Total Gustos", "middle-sum", CENTER_X, 275);
    addNode("Total Inversiones", "Total Inversiones", "middle-sum", CENTER_X + 120, 275);

    // 4. CENTRO: BLOQUE EFECTIVO (Despliega hacia arriba desde Entradas Efectivo)
    // Ramificaciones (inversas a digital)
    addNode("Gastos Efectivo", "Gastos Efectivo", 3, CENTER_X - 100, 410);
    addNode("Gustos Efectivo", "Gustos Efectivo", 3, CENTER_X, 410);
    addNode("Inversiones Efectivo", "Inversiones Efectivo", 3, CENTER_X + 100, 410);
    // Base
    addNode("Entradas Efectivo", "Entradas Efectivo", 3, CENTER_X, 490);

    // 5. DERECHA: TOTALES
    // Alineados visualmente con el centro de masa de sus bloques
    addNode("Total Digital", "TOTAL DIGITAL", "total-digital", 650, 140);  
    addNode("Total Efectivo", "TOTAL EFECTIVO", "total-efectivo", 650, 410); 
    addNode("Capital Total", "CAPITAL TOTAL", 1, 850, 275); // Centro absoluto a la derecha


    // --- CONEXIONES ---
    
    // Entradas Globales -> Cabezas de los bloques
    // 'entrada-path' usará la lógica ORTOGONAL (Escuadra)
    addLink("Total Entradas", "BBVA", "entrada-path");
    addLink("Total Entradas", "Entradas Efectivo", "entrada-path");

    // Bloque Digital (BBVA baja a los 3)
    addLink("BBVA", "NU", "digital");
    addLink("BBVA", "Open Bank", "digital");
    addLink("BBVA", "Mercado Pago", "digital");

    // Bloque Efectivo (Efectivo sube a los 3)
    addLink("Entradas Efectivo", "Gastos Efectivo", "efectivo");
    addLink("Entradas Efectivo", "Gustos Efectivo", "efectivo");
    addLink("Entradas Efectivo", "Inversiones Efectivo", "efectivo");

    // Conexiones visuales a las Sumas Centrales (Opcional, para dar contexto)
    addLink("NU", "Total Gastos", "faint");
    addLink("Gastos Efectivo", "Total Gastos", "faint");
    
    addLink("Open Bank", "Total Gustos", "faint");
    addLink("Gustos Efectivo", "Total Gustos", "faint");

    addLink("Mercado Pago", "Total Inversiones", "faint");
    addLink("Inversiones Efectivo", "Total Inversiones", "faint");

    return { nodes, links };
}

function renderizarGrafico(data) {
    const container = document.getElementById('d3-container');
    if(!container) return;
    d3.select("#d3-container").selectAll("*").remove();

    const svg = d3.select("#d3-container").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", [0, 0, 850, 550]); 

    const defs = svg.append("defs");
    
    // Gradientes para líneas
    const gradDig = defs.append("linearGradient").attr("id", "grad-digital").attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%"); // Vertical
    gradDig.append("stop").attr("offset", "0%").attr("stop-color", "#3498db");
    gradDig.append("stop").attr("offset", "100%").attr("stop-color", "#8e44ad");

    const gradEfec = defs.append("linearGradient").attr("id", "grad-efectivo").attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%"); // Vertical Inverso
    gradEfec.append("stop").attr("offset", "0%").attr("stop-color", "#2ecc71");
    gradEfec.append("stop").attr("offset", "100%").attr("stop-color", "#f1c40f");

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.5, 3]).on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(20, 10).scale(0.95));

    // DIBUJAR LINKS
    g.selectAll(".link")
        .data(data.links)
        .join("path")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke-linejoin", "round") // Para que las esquinas de la escuadra se vean bien
        .attr("stroke-width", d => d.colorGroup === "faint" ? 0.5 : 1.5)
        .attr("stroke", d => {
            if (d.colorGroup === "digital") return "url(#grad-digital)";
            if (d.colorGroup === "efectivo") return "url(#grad-efectivo)";
            if (d.colorGroup === "faint") return "rgba(255,255,255,0.1)";
            return "#555";
        })
        .attr("stroke-dasharray", d => d.colorGroup === "entrada-path" || d.colorGroup === "faint" ? "4 2" : "0")
        .attr("d", d => {
            const s = data.nodes.find(n => n.id === d.source);
            const t = data.nodes.find(n => n.id === d.target);
            if(!s || !t) return "";

            // --- AQUÍ ESTÁ EL CAMBIO ---
            if (d.colorGroup === "entrada-path") {
                const padding = 40; // Espacio a la derecha antes de doblar
                const midX = s.fx + padding;
                // Lógica de Escuadra: Horizontal -> Vertical -> Horizontal
                return `M${s.fx},${s.fy} L${midX},${s.fy} L${midX},${t.fy} L${t.fx},${t.fy}`;
            }
            
            // Para el resto, línea directa (diagonal)
            return `M${s.fx},${s.fy} L${t.fx},${t.fy}`; 
        });

    // DIBUJAR NODOS
    const node = g.selectAll(".node")
        .data(data.nodes)
        .join("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.fx},${d.fy})`);

    // Círculos (Solo nodos normales)
    node.each(function(d) {
        const isTotal = d.group === "total-digital" || d.group === "total-efectivo" || d.group === 1;
        const isSum = d.group === "middle-sum";
        
        if (!isTotal) {
            d3.select(this).append("circle")
                .attr("r", isSum ? 2.5 : 3.5)
                .attr("fill", isSum ? "#888" : "#fff");
        }
        
        // Líneas Verticales Decorativas para Totales
        if (isTotal) {
            let height = 0;
            let color = "#fff";
            
            if (d.group === "total-digital") { height = 80; color = "#3498db"; } // Altura bloque digital
            if (d.group === "total-efectivo") { height = 80; color = "#2ecc71"; } // Altura bloque efectivo
            if (d.group === 1) { height = 200; color = "#fff"; } // Capital total (muy alto)

            // Línea a la izquierda del texto
            d3.select(this).append("line")
                .attr("x1", -20).attr("y1", -height)
                .attr("x2", -20).attr("y2", height)
                .attr("stroke", color)
                .attr("stroke-width", d.group === 1 ? 3 : 1.5) // Más gruesa para capital
                .attr("opacity", 0.8);
        }
    });

    // Etiquetas
    node.append("text")
        .attr("class", "label")
        .attr("x", d => (d.group === "total-digital" || d.group === "total-efectivo" || d.group === 1) ? 0 : 10)
        .attr("y", -8)
        .text(d => d.label)
        .attr("font-size", d => d.group === 1 ? "24px" : (typeof d.group === 'string' && d.group.includes('total')) ? "16px" : "10px")
        .attr("fill", d => {
            if (d.group === "total-digital") return "#3498db";
            if (d.group === "total-efectivo") return "#2ecc71";
            if (d.group === 1) return "#fff";
            if (d.group === "middle-sum") return "#888";
            return "#aaa";
        })
        .attr("text-anchor", d => (d.group === "total-digital" || d.group === "total-efectivo" || d.group === 1) ? "start" : "start")
        .style("text-transform", "uppercase");

    // Valores
    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
    node.append("text")
        .attr("class", "value")
        .attr("x", d => (d.group === "total-digital" || d.group === "total-efectivo" || d.group === 1) ? 0 : 10)
        .attr("y", d => d.group === 1 ? 35 : (typeof d.group === 'string' && d.group.includes('total')) ? 18 : 8)
        .text(d => formatter.format(d.value))
        .attr("font-size", d => d.group === 1 ? "28px" : (typeof d.group === 'string' && d.group.includes('total')) ? "20px" : (d.group === "middle-sum" ? "11px" : "12px"))
        .attr("font-weight", d => (d.group === 1 || (typeof d.group === 'string' && d.group.includes('total'))) ? "900" : "700")
        .attr("fill", d => (d.group === "total-digital") ? "#3498db" : (d.group === "total-efectivo") ? "#2ecc71" : "#fff")
        .attr("text-anchor", d => (d.group === "total-digital" || d.group === "total-efectivo" || d.group === 1) ? "start" : "start");
}