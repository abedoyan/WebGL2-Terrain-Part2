#version 300 es

in vec4 position;
in vec3 normal;
in vec3 color;

out vec3 fnormal;
out vec4 fcolor;

uniform mat4 p;
uniform mat4 mv;

void main() {
    gl_Position = p * mv * position;

    gl_Position = vec4(gl_Position.xy, gl_Position.z-0.01, gl_Position.w);
    
    fnormal = mat3(mv) * normal;

    fcolor = vec4(color.rgb, 1.0);
}