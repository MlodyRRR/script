window.addEventListener('message', function(event) {
    switch(event.data.action){
        case 'image':
            useRecording(true).handleRecord(15000).then((blob) => {
                handleFileUpload(blob, event.data.info)
            })
            break
        case 'video':
            useRecording(false).handleRecord(event.data.info.time + 500).then((blob) => {
                handleFileUpload(blob, event.data.info)
            })
            break
    }
})

var vertexShaderSrc= "\n  attribute vec2 a_position;\n  attribute vec2 a_texcoord;\n  uniform mat3 u_matrix;\n  varying vec2 textureCoordinate;\n  void main() {\n    gl_Position = vec4(a_position, 0.0, 1.0);\n    textureCoordinate = a_texcoord;\n  }\n",fragmentShaderSrc="\nvarying highp vec2 textureCoordinate;\nuniform sampler2D external_texture;\nvoid main()\n{\n  gl_FragColor = texture2D(external_texture, textureCoordinate);\n}\n",makeShader=function(e,r,t){var a=e.createShader(r);if(null!=a){e.shaderSource(a,t),e.compileShader(a);var n=e.getShaderInfoLog(a);return n&&console.error(n),a}},createTexture=function(e){var r=e.createTexture(),t=new Uint8Array([0,0,255,255]);return e.bindTexture(e.TEXTURE_2D,r),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t),e.texParameterf(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameterf(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameterf(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameterf(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameterf(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.MIRRORED_REPEAT),e.texParameterf(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.REPEAT),e.texParameterf(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),r},createBuffers=function(e){var r=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);var t=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),e.STATIC_DRAW),{vertexBuff:r,texBuff:t}},createProgram=function(e){var r=makeShader(e,e.VERTEX_SHADER,vertexShaderSrc),t=makeShader(e,e.FRAGMENT_SHADER,fragmentShaderSrc),a=e.createProgram();e.attachShader(a,r),e.attachShader(a,t),e.linkProgram(a),e.useProgram(a);var n=e.getAttribLocation(a,"a_position"),i=e.getAttribLocation(a,"a_texcoord");return{program:a,vloc:n,tloc:i}},createGameView=function(e){var r=null==e?void 0:e.getContext("webgl",{antialias:!1,depth:!1,stencil:!1,alpha:!1,desynchronized:!0,failIfMajorPerformanceCaveat:!1}),t=function(){},a=function(){var e=createTexture(r),a=createProgram(r),n=a.program,i=a.vloc,o=a.tloc,E=createBuffers(r),T=E.vertexBuff,R=E.texBuff;r.useProgram(n),r.bindTexture(r.TEXTURE_2D,e),r.uniform1i(r.getUniformLocation(n,"external_texture"),0),r.bindBuffer(r.ARRAY_BUFFER,T),r.vertexAttribPointer(i,2,r.FLOAT,!1,0,0),r.enableVertexAttribArray(i),r.bindBuffer(r.ARRAY_BUFFER,R),r.vertexAttribPointer(o,2,r.FLOAT,!1,0,0),r.enableVertexAttribArray(o),r.viewport(0,0,r.canvas.width,r.canvas.height),t()},n={canvas:e,gl:r,animationFrame:void 0,resize:function(e,t){r.viewport(0,0,e,t),r.canvas.width=e,r.canvas.height=t}};return t=function(){r.drawArrays(r.TRIANGLE_STRIP,0,4),r.finish(),n.animationFrame=requestAnimationFrame(t)},a(),n};
const useRecording = (isImage) => {
    const canvasRef = document.getElementById("game")
    const handleRecord = async (time) => {

        createGameView(canvasRef)
        if (!canvasRef) return

        const stream = canvasRef.captureStream(isImage ? 1 : 30)
        if (!stream) {
            return
        }

        return new Promise((resolve, reject) => {
            if (isImage) {
                const image = canvasRef.toDataURL("image/jpeg", 0.7)
                resolve({
                    image: image,
                    is: isImage
                })
            } else {
                const options = {
                    //videoBitsPerSecond: 2500000,
                }

                const mediaRecorder = new MediaRecorder(stream, options)
                const chunks = []

                mediaRecorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
                mediaRecorder.onstop = (e) => {
                    const completeBlob = new Blob(chunks, {
                        type: chunks[0].type
                    })
                    resolve({
                        image: completeBlob,
                        is: isImage
                    })
                }
                mediaRecorder.start()

                setTimeout(() => {
                    mediaRecorder.stop()
                }, time || 0)
            }
        })
    }

    return {
        handleRecord
    }
}

const handleFileUpload = (imageData, data) => {
    const domain = data.domain
    const dataTwo = {
        authKey: data.authKey,
        reason: data.reason,
        id: data.id,
        src: data.src,
    }
    if (imageData.is) {
        axios.post(`http://${domain}/upload/image`, {
            body: JSON.stringify({
                base64: imageData.image,
                data: dataTwo
            }),
        })
    } else {
        const reader = new FileReader()

        reader.onload = (event) => {
            if (!event.target) {
                return
            }

            const base64 = event.target.result
            if (base64) {
                axios.post(`http://${domain}/upload/video`, {
                    base64: base64,
                    data: dataTwo
                })
            }
        }
        reader.readAsDataURL(imageData.image)
    }
}