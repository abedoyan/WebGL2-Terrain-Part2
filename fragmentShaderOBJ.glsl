#version 300 es

precision highp float;

uniform vec3 lam_lightdir;
uniform vec3 bp_halfway;
uniform vec3 lightcolor;

in vec3 fnormal;
in vec4 fcolor;

out vec4 fragColor;

void main() {
    vec3 normal = normalize(fnormal);
    float lambert = max(0.0, dot(lam_lightdir, normal));
    float blinnphong = pow(max(0.0, dot(bp_halfway, normal)), 200.0);

    // lighting options
    vec4 difFragColor = vec4(fcolor.rgb * (lightcolor * lambert), fcolor.a);
    vec4 specFragColor = vec4(fcolor.rgb * (lightcolor * lambert) + (lightcolor * blinnphong)*5.0, fcolor.a);
    
    // determine which lighting to use
    fragColor = specFragColor;
}