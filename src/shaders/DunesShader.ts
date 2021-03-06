import { BaseShader, FullModel, DiffuseShader } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

export class DunesShader extends DiffuseShader {
    /** Uniforms are of type `WebGLUniformLocation` */
    uTime: WebGLUniformLocation | undefined;
    sDust: WebGLUniformLocation | undefined;
    uDustOpacity: WebGLUniformLocation | undefined;
    sDetail1: WebGLUniformLocation | undefined;
    uColor: WebGLUniformLocation | undefined;
    uFogColor: WebGLUniformLocation | undefined;
    uShadowColor: WebGLUniformLocation | undefined;
    uWavesColor: WebGLUniformLocation | undefined;
    fogStartDistance: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    detailStartDistance: WebGLUniformLocation | undefined;
    detailDistance: WebGLUniformLocation | undefined;

    private static lightmapIndex = 0;

    // Attributes are numbers.
    rm_Normal: number | undefined;

    static getInstance(gl: WebGLRenderingContext | WebGL2RenderingContext, lightmapIndex: number) {
        DunesShader.lightmapIndex = lightmapIndex;
        return new DunesShader(gl);
    }

    fillCode() {
        this.vertexShaderCode = "uniform mat4 view_proj_matrix;\n" +
            "attribute vec4 rm_Vertex;\n" +
            "attribute vec2 rm_TexCoord0;\n" +
            "attribute vec3 rm_Normal;\n" +
            "varying vec2 vTextureCoord;\n" +
            "varying vec2 vUpwindTexCoord;\n" +
            "varying vec2 vLeewardTexCoord2;\n" +
            "varying vec2 vWindSpotsTexCoord;\n" +
            "varying vec3 vNormal;\n" +
            "varying float vSlopeCoeff;\n" + // Windward slope coefficient
            "varying float vSlopeCoeff2;\n" + // Leeward slope coefficient
            "varying vec2 vDetailCoord1;\n" +
            "varying float vFogAmount;\n" +
            "varying float vDetailFade;\n" +
            "\n" +
            "uniform float fogDistance;\n" +
            "uniform float fogStartDistance;\n" +
            "uniform float detailDistance;\n" +
            "uniform float detailStartDistance;\n" +
            "uniform float uTime;\n" +
            "\n" +
            "void main() {\n" +
            "  gl_Position = view_proj_matrix * rm_Vertex;\n" +
            "  vTextureCoord = rm_TexCoord0;\n" +
            "  vNormal = rm_Normal;\n" +
            "  vSlopeCoeff = clamp( 4.0*dot(vNormal, normalize(vec3(1.0, 0.0, 0.13))), 0.0, 1.0);\n" +
            "  vSlopeCoeff2 = clamp( 14.0*dot(vNormal, normalize(vec3(-1.0, 0.0, -0.2))), 0.0, 1.0);\n" +
            "  vUpwindTexCoord = vTextureCoord * vec2(100.0, 10.0);\n" +
            "  vUpwindTexCoord.y += uTime;\n" +

            "  vDetailCoord1 = rm_TexCoord0 * vec2(100.0, 100.0);\n" +

            "  vLeewardTexCoord2 = vTextureCoord * vec2(20.0, 30.0);\n" +
            "  vLeewardTexCoord2.y += uTime;\n" +

            "  vWindSpotsTexCoord = vTextureCoord * vec2(1.5, 1.5);\n" +
            "  vWindSpotsTexCoord.x += uTime * 0.1;\n" +
            "  vFogAmount = clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);\n" +
            "  vDetailFade = 1.0 - clamp((length(gl_Position) - detailStartDistance) / detailDistance, 0.0, 1.0);\n" +
            "}";

        this.fragmentShaderCode = "precision mediump float;\n" +
            "varying vec2 vTextureCoord;\n" +
            "varying vec3 vNormal;\n" +
            "varying float vSlopeCoeff;\n" +
            "varying float vSlopeCoeff2;\n" +
            "varying vec2 vUpwindTexCoord;\n" +
            "varying vec2 vLeewardTexCoord2;\n" +
            "varying vec2 vWindSpotsTexCoord;\n" +
            "varying vec2 vDetailCoord1;\n" +
            "varying float vFogAmount;\n" +
            "varying float vDetailFade;\n" +

            "uniform sampler2D sTexture;\n" +
            "uniform sampler2D sDust;\n" +
            "uniform sampler2D sDetail1;\n" +
            "uniform float uDustOpacity;\n" +
            "uniform vec4 uColor;\n" +
            "uniform vec4 uFogColor;\n" +
            "uniform vec4 uShadowColor;\n" +
            "uniform vec4 uWavesColor;\n" +

            "void main() {\n" +
            "  vec4 windward = texture2D(sDust, vUpwindTexCoord);\n" +
            "  vec4 leeward2 = texture2D(sDust, vLeewardTexCoord2);\n" +
            "  vec4 detailColor = texture2D(sDetail1, vDetailCoord1);" +
            "  float detail1 = detailColor.g - 0.5;\n" +
            "  float detail2 = detailColor.r - 0.5;\n" +

            "  detail1 *= vDetailFade;\n" +
            "  detail2 *= vDetailFade;\n" +

            "  vec4 textureData = texture2D(sTexture, vTextureCoord);\n" +
            "  gl_FragColor = textureData.r * uColor;\n" +
            // "  gl_FragColor.b += vSlopeCoeff;\n" + // windward slopes visualization
            // "  gl_FragColor.g += vSlopeCoeff2;\n" + // leeward slopes visualization
            "  vec4 waves = windward * uDustOpacity * vSlopeCoeff;\n" +
            "  waves += leeward2 * uDustOpacity * vSlopeCoeff2;\n" +
            "  waves *= 1.0 - clamp(texture2D(sDust, vWindSpotsTexCoord).r * 5.0, 0.0, 1.0);\n" +
            "  gl_FragColor += waves * uWavesColor;\n" +
            "  gl_FragColor.rgb += mix(detail2, detail1, vSlopeCoeff2);\n" +
            "  gl_FragColor *= mix(uShadowColor, vec4(1.0, 1.0, 1.0, 1.0), textureData[" + DunesShader.lightmapIndex + "]);"+
            "  gl_FragColor = mix(gl_FragColor, uFogColor, vFogAmount);\n" +
            // "  gl_FragColor.r = vDetailFade;\n" + // detail distance visualization
            // "  gl_FragColor.r = texture2D(sDust, vWindSpotsTexCoord).r;\n" + // wind terrain spots visualization
            "}";
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();

        this.rm_Normal = this.getAttrib("rm_Normal");
        this.sDust = this.getUniform("sDust");
        this.uTime = this.getUniform("uTime");
        this.uDustOpacity = this.getUniform("uDustOpacity");
        this.sDetail1 = this.getUniform("sDetail1");
        this.uColor = this.getUniform("uColor");
        this.uFogColor = this.getUniform("uFogColor");
        this.uShadowColor = this.getUniform("uShadowColor");
        this.uWavesColor = this.getUniform("uWavesColor");
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
        this.detailStartDistance = this.getUniform("detailStartDistance");
        this.detailDistance = this.getUniform("detailDistance");
    }
}
