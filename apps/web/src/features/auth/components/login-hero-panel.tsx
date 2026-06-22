import { LOGIN_ACCESS_CARDS } from "../login.config";

/**
 * Panel izquierdo del login: se superpone a la zona azul de la imagen de fondo
 * (apps/web/public/login-bg.png). El degradado refuerza el contraste del texto
 * blanco sin oscurecer el resto de la imagen.
 */
export function LoginHeroPanel() {
  return (
    <section className="relative hidden w-[42%] max-w-lg flex-col justify-between overflow-hidden p-8 text-white lg:flex xl:p-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#001C55]/70 via-[#001C55]/25 to-transparent" />

      <div className="relative z-10 max-w-sm">
        <div className="mb-8">
          <div className="text-xs font-medium tracking-[0.3em] text-blue-200 uppercase">
            SafeCampus
          </div>
          <div className="text-3xl leading-tight font-bold text-white">PUCP</div>
        </div>

        <h1 className="mb-4 text-3xl leading-tight font-bold xl:text-4xl">
          Sistema Omnicanal de Gestión de Incidentes
        </h1>

        <p className="text-base leading-relaxed text-blue-100/90 xl:text-lg">
          Plataforma centralizada para la seguridad de la Pontificia Universidad
          Católica del Perú. Tres interfaces complementarias para toda la
          comunidad universitaria.
        </p>
      </div>

      <div className="relative z-10 max-w-xs space-y-3">
        {LOGIN_ACCESS_CARDS.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm"
          >
            <item.icon className="h-4 w-4 shrink-0 text-blue-200" />
            <div>
              <div className="text-sm font-semibold text-white">{item.label}</div>
              <div className="text-xs text-blue-200/80">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
