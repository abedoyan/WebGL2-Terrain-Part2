// constants to use throughout the program
const IlliniBlue = new Float32Array([0.075, 0.16, 0.292, 1])
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1])
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])
window.objFileExists = false


/** Compile and link the vertex and fragment shaders */ 
function compileAndLinkGLSL(vs_source, fs_source) {
    // compile the vertex shader
    let vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    // compile the fragment shader
    let fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }
    
    // link the shaders in one program
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }

    // return the program
    return program
}


/** Sends per-vertex data to the GPU and connects it to a VS input */
function supplyDataBuffer(data, program, vsIn, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW
    
    let buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    let f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)
    
    let loc = gl.getAttribLocation(program, vsIn)
    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)
    
    return buf;
}


/** Creates a Vertex Array Object and puts into it all of the data in the given */
function setupGeometry(geom, program) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for(let name in geom.attributes) {
        let data = geom.attributes[name]
        supplyDataBuffer(data, program, name)
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}


/** 
 * Draws a square NxN grid with z-values initially set to 0
 * To be used for the faulting terrain required and optional portions 
 */ 
function makeGrid(n) {
    var g =
    {"triangles": []
    ,"attributes":
        {"position": []
        ,"aTexCoord": []}
    }

    for(let col=0; col<n; col+=1) {
        for(let row=0; row<n; row+=1) {
            let x = row/(n-1)*2 - 1
            let y = col/(n-1)*2 - 1
            g.attributes.position.push([x, y, 0])
            g.attributes.aTexCoord.push([x,y])
        }
    }

    for(let i=0; i<n*n-n; i+=1) {
        g.triangles.push([i, i+1, i+n])
        g.triangles.push([i+n, i+1, i+n+1])

        if(i%n == n-2){
            i+=1
        }
    }
    return g
}


/** Generates terrain using the faulting method and rescales height */
function faulting(grid, faults) {
    let delta = 0.8
    let scale = 1
    window.xmin = 0
    window.xmax = 0
    window.ymin = 0
    window.ymax = 0
    window.zmin = 0
    window.zmax = 0

    for(let i=0; i<faults; i+=1){
        let p = ([Math.random()*2-1, Math.random()*2-1, 0])
        let ang = Math.random()*Math.PI*2
        let norm = [Math.cos(ang), Math.sin(ang), 0]

        for(let j = 0; j < grid.attributes.position.length; j+=1) {
            let b = grid.attributes.position[j]
            let dotProd = dot(sub(b, p), norm)

            if (dotProd < 0){
                grid.attributes.position[j][2] -= delta
            }
            else{
                grid.attributes.position[j][2] += delta
            }

            // keep track of min and max for x and z
            if (grid.attributes.position[j][0] < xmin){
                xmin = grid.attributes.position[j][0]
            }
            if (grid.attributes.position[j][0] > xmax){
                xmax = grid.attributes.position[j][0]
            }
            if (grid.attributes.position[j][1] < ymin){
                ymin = grid.attributes.position[j][1]
            }
            if (grid.attributes.position[j][1] > ymax){
                ymax = grid.attributes.position[j][1]
            }
            if (grid.attributes.position[j][2] < zmin){
                zmin = grid.attributes.position[j][2]
            }
            if (grid.attributes.position[j][2] > zmax){
                zmax = grid.attributes.position[j][2]
            }
        }
        delta = delta * scale
    }

    // fix vertical separation
    let h = (xmax - xmin)*(1/2)

    if (h != 0){
        for(let i = 0; i < grid.attributes.position.length; i+=1){
            let z = ((grid.attributes.position[i][2] - zmin)/(zmax - zmin))*h - (h/2)
            grid.attributes.position[i][2] = z
        }
    }

    return grid
}



/** Draw the required terrain and the OBJ object
 *  Includes checkboxes with options to add specular lighting and color
*/
function drawReq() {
    gl.clearColor(...IlliniBlue) // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    
    let lightdir = normalize([1,1,1])
    let halfway = normalize(add(lightdir, [0,0,1]))

    if (objFileExists == true){
        //draw program2
        gl.useProgram(program2)
        gl.bindVertexArray(geom2.vao)

        // lambert light
        gl.uniform3fv(gl.getUniformLocation(program2, 'lam_lightdir'), lightdir)
        // blinn phong light
        gl.uniform3fv(gl.getUniformLocation(program2, 'bp_halfway'), halfway)
        // light color
        gl.uniform3fv(gl.getUniformLocation(program2, 'lightcolor'), [1, 1, 1])
    
        gl.uniform4fv(gl.getUniformLocation(program2, 'color'), [1, 0.373, 0.02, 1])
        gl.uniformMatrix4fv(gl.getUniformLocation(program2, 'mv'), false, m4mult(v, m))
        gl.uniformMatrix4fv(gl.getUniformLocation(program2, 'p'), false, p)

        gl.drawElements(geom2.mode, geom2.count, geom2.type, 0)
    }
    
    //draw program1
    gl.useProgram(program1)
    gl.bindVertexArray(geom1.vao)
    
    // lambert light
    gl.uniform3fv(gl.getUniformLocation(program1, 'lam_lightdir'), lightdir)
    // blinn phong light
    gl.uniform3fv(gl.getUniformLocation(program1, 'bp_halfway'), halfway)
    // light color
    gl.uniform3fv(gl.getUniformLocation(program1, 'lightcolor'), [1,1,1])

    gl.uniformMatrix4fv(gl.getUniformLocation(program1, 'mv'), false, m4mult(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(program1, 'p'), false, p)

    if (objFileExists == true){
        gl.uniform1f(gl.getUniformLocation(program1, 'factor'), false, 1.0)
    }
    else{
        gl.uniform1f(gl.getUniformLocation(program1, 'factor'), false, 0.0)
    }

    gl.drawElements(geom1.mode, geom1.count, geom1.type, 0)

    
}


// adds normals to the geometry object
function addNormals(geom) {
    geom.attributes.normal = []

    for(let i=0; i<geom.attributes.position.length; i+=1) {
        geom.attributes.normal.push([0,0,0])
    }

    for(let i=0; i<geom.triangles.length; i+=1) {
        let tri = geom.triangles[i]
        let p0 = geom.attributes.position[tri[0]]
        let p1 = geom.attributes.position[tri[1]]
        let p2 = geom.attributes.position[tri[2]]
        //console.log(p0, p1, p2)
        let e1 = sub(p1,p0)
        let e2 = sub(p2,p0)
        let n = cross(e1,e2)
        geom.attributes.normal[tri[0]] = add(geom.attributes.normal[tri[0]], n)
        geom.attributes.normal[tri[1]] = add(geom.attributes.normal[tri[1]], n)
        geom.attributes.normal[tri[2]] = add(geom.attributes.normal[tri[2]], n)
    }

    for(let i=0; i<geom.attributes.position.length; i+=1) {
        geom.attributes.normal[i] = normalize(geom.attributes.normal[i])
    }
}


function flight(){
    if (keysBeingPressed['w'] || keysBeingPressed['W']){
        camera = add(camera, mul(forward,move))
        center = add(center, mul(forward,move))
        //forward = add(forward, mul(forward,move))
    }
    if (keysBeingPressed['s'] || keysBeingPressed['S']){
        camera = add(camera, mul(forward,-move))
        center = add(center, mul(forward,-move))
        //forward = add(forward, mul(forward,-move))
    }
    if (keysBeingPressed['a'] || keysBeingPressed['A']){
        let left = normalize(cross(up, forward)) 
        camera = add(camera, mul(left, move))
        center = add(center, mul(left,move))
        //forward = add(forward, mul(left,move))
    }
    if (keysBeingPressed['d'] || keysBeingPressed['D']){
        let right = normalize(cross(forward, up))
        camera = add(camera, mul(right, move))
        center = add(center, mul(right,move))
        //forward = add(forward, mul(right,move))
    }
    if (keysBeingPressed['ArrowUp']){
        center = add(center, mul(forward,move))
        //forward = add(forward, mul(forward,move))
    }
    if (keysBeingPressed['ArrowDown']){
        center = add(center, mul(forward,-move))
        //forward = add(forward, mul(forward,-move))
    }
    if (keysBeingPressed['ArrowLeft']){
        let left = normalize(cross(up, forward)) 
        center = add(center, mul(left,move))
        //forward = add(forward, mul(left,move))
    }
    if (keysBeingPressed['ArrowRight']){
        let right = normalize(cross(forward, up))
        center = add(center, mul(right,move))
        //forward = add(forward, mul(right,move))
    }
}


function groundMode(grid) {
    let cameraPos = [...camera]
    let n = 10
    let pos = [(cameraPos[0] + 1) / 2 * (n - 1), (cameraPos[1] + 1) / 2 * (n - 1)]
    let row = Math.floor(pos[1])
    let col = Math.floor(pos[0])
    let x = pos[0] - col
    let y = pos[1] - row

    let i1 = row * n + col
    let i2 = i1 + 1
    let i3 = (row + 1) * n + col
    let i4 = i3 + 1

    let height = 0
    
    if (x + y < 1) {
        height = grid.attributes.position[i1][2] + x * (grid.attributes.position[i2][2] - grid.attributes.position[i1][2]) + y * (grid.attributes.position[i3][2] - grid.attributes.position[i1][2])
    } else {
        height = grid.attributes.position[i4][2] + (1 - x) * (grid.attributes.position[i3][2] - grid.attributes.position[i4][2]) + (1 - y) * (grid.attributes.position[i2][2] - grid.attributes.position[i4][2])
    }

    cameraPos[2] = height + (2 * 2/dim)

    camera = cameraPos
}



/** Compute any time-varying or animated aspects of the scene */
function timeStep() {
    flight()

    if (fog == true){
        gl.uniform1f(gl.getUniformLocation(program1, 'fog'), 1.0)
    }
    else{
        gl.uniform1f(gl.getUniformLocation(program1, 'fog'), 0.0)
    }

    if (ground == true){
        groundMode(land)
        move = 0.0025
    }
    else{
        camera[2] = 1.5
        move = 0.01
    }
    
    v = (m4view(camera, center, up))
    
    drawReq() 
    window.pending = requestAnimationFrame(timeStep)
}


/** Resizes the canvas to completely fill the screen */
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''

    if (window.gl) {
        gl.viewport(0,0, canvas.width, canvas.height)
        window.p = m4perspNegZ(0.05, 5, 1, canvas.width, canvas.height)
    }
}


/** Load an image to use as a texture */
async function loadTexture(){
    let img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'farm.jpg';
    img.addEventListener('load', (event) => {
        let slot = 0;
        let texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img,
        );
        gl.generateMipmap(gl.TEXTURE_2D)
    })

    let bindPoint = gl.getUniformLocation(program1, 'imgTexture')
    gl.uniform1i(bindPoint, slot)
}


/** Compile, link, other option-independent setup */
async function setup(event) {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        // optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
        {antialias: false, depth:true, preserveDrawingBuffer:true}
    )

    // create program for the terrain
    let vs1 = await fetch('vertexShader.glsl').then(res => res.text())
    let fs1 = await fetch('fragmentShader.glsl').then(res => res.text())
    window.program1 = compileAndLinkGLSL(vs1,fs1)

    // create program for the OBJ
    let vs2 = await fetch('vertexShaderOBJ.glsl').then(res => res.text());
    let fs2 = await fetch('fragmentShaderOBJ.glsl').then(res => res.text());
    window.program2 = compileAndLinkGLSL(vs2, fs2);


    // more setup here
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    window.camera = [0, 3.5, 1.5]
    window.center = [0,0,0]
    window.up = [0,0,1]
    
    window.m = IdentityMatrix
    window.v = m4view(camera, center, up)

    window.move = 0.01

    window.forward = [0,-1,0]

    window.fog = false
    window.ground = false
    //window.objFileExists = false

    // get the size of grid and number of faults
    window.dim = 100
    let f = 100

    // render the geometry
    loadTexture()

    let data = makeGrid(dim)
    window.land = faulting(data, f)
    addNormals(land)
    window.geom1 = setupGeometry(land, program1)

    if (objFileExists == true){
        addNormals(obj)
        window.geom2 = setupGeometry(obj, program2)
    }
    
    fillScreen()
    window.addEventListener('resize', fillScreen)
    timeStep()
}


/**
 * Generate geometry, render the scene
 */
function setupScene(scene, options) {
    console.log("To do: render",scene,"with options",options)

    if (scene == "terrain"){
        cancelAnimationFrame(window.pending)

        // get the size of grid and number of faults
        dim = options["resolution"]
        let f = options["slices"]

        // render the geometry
        let data = makeGrid(dim)
        window.land = faulting(data, f)
        addNormals(land)
        window.geom1 = setupGeometry(land, program1)
        
        if (objFileExists = true){
            addNormals(obj)
            window.geom2 == setupGeometry(obj, program2)
        }
        fillScreen()
        window.addEventListener('resize', fillScreen)
        timeStep()
    }
}


//loads and parses an OBJ file
async function objectLoad(event){    
    window.obj =
    {"triangles": []
    ,"attributes":
        {"position": []
        ,"color": []}
    }

    await fetch('./example.obj')
    .then(response => {
        if (!response.ok) {
            throw new Error('Fetch failed')
        }
        return response.text()
    })
    .then(data => {

    objFileExists = true
    if (objFileExists == true){
       const lines = data.trim().split('\n')

        for (const line of lines) {
            const parts = line.trim().split(/\s+/)
            switch (parts[0]) {
            case 'v':
                obj.attributes.position.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])])
                if (parseFloat(parts[4])){
                    obj.attributes.color.push([parseFloat(parts[4]), parseFloat(parts[5]), parseFloat(parts[6])])
                }
                else{
                    obj.attributes.color.push([...IlliniOrange])
                }
                break
            case 'f':
                obj.triangles.push([parseInt(parts[1]) - 1, parseInt(parts[2]) - 1, parseInt(parts[3]) - 1])
                break
            }
        }
    }
    })
    .catch(error => {
        console.error('Error fetching OBJ file', error)
        objFileExists = false
    })

    return obj
}


window.addEventListener('load',objectLoad)
window.addEventListener('load',setup)

window.keysBeingPressed = {}
window.addEventListener('keydown', 
    (event) => {
        keysBeingPressed[event.key] = true
    }
)

window.addEventListener('keyup', 
    (event) => {
        keysBeingPressed[event.key] = false
    }
)

window.addEventListener('keyup', 
    (event) => {
        if (event.key == 'f' || event.key == 'F') {
            if (fog == false){
                fog = true
                console.log("fog is now turned on", fog)
            }
            else if (fog == true){
                fog = false
                console.log("fog is now turned off", fog)
            }   
        }
    }
)

window.addEventListener('keyup', 
    (event) => {
        if (event.key == 'g' || event.key == 'G') {
            if (ground == false){
                ground = true
                console.log("ground mode activated", ground)
            }
            else if (ground == true){
                ground = false
                console.log("ground mode deactivated", ground)
            }   
        }
    }
)

