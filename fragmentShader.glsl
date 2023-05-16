#version 300 es

precision highp float;

//uniform vec4 color;
uniform vec3 lam_lightdir;
uniform vec3 bp_halfway;
uniform vec3 lightcolor;
uniform sampler2D imgTexture;
uniform float fog;
uniform float factor;

in vec3 fnormal;
in vec2 vTexCoord;

out vec4 fragColor;

void main() {
    vec3 normal = normalize(fnormal);
    float lambert = max(0.0, dot(lam_lightdir, normal));
    float blinnphong = pow(max(0.0, dot(bp_halfway, normal)), 200.0);
    
    vec4 fcolor = texture(imgTexture, vTexCoord);

    float fogfactor = factor == 1.0 ? 150.0 : 4.0;
    vec4 fogColor = (fcolor*((1.0-gl_FragCoord.z)*150.0)); 
    
    vec4 color = fog == 1.0 ? fogColor : fcolor;

    // lighting options
    vec4 difFragColor = vec4(color.rgb * (lightcolor * lambert), color.a);
    vec4 specFragColor = vec4(color.rgb * (lightcolor * lambert) + (lightcolor * blinnphong)*5.0, color.a);
    
    // determine which lighting to use
    fragColor = difFragColor;
}