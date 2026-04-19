import { Shield } from "lucide-react";

import { LOGIN_ACCESS_CARDS } from "../login.config";

export function LoginHeroPanel() {
  return (
    <section className="relative hidden w-[420px] flex-col justify-between overflow-hidden p-10 text-white lg:flex">
      <div className="pointer-events-none absolute inset-0 opacity-10">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="absolute rounded-full border border-white"
            style={{
              width: `${(index + 1) * 160}px`,
              height: `${(index + 1) * 160}px`,
              top: "55%",
              left: "50%",
              transform: "translate(-50%,-50%)",
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="text-xs font-medium tracking-widest text-blue-200 uppercase">
              SafeCampus
            </div>
            <div className="text-3xl leading-7 font-bold text-white">PUCP</div>
          </div>
        </div>

        <h1 className="mb-4 text-5xl leading-tight font-bold">
          Sistema Omnicanal de Gestion de Incidentes
        </h1>

        <p className="text-2xl leading-relaxed text-blue-200">
          Plataforma centralizada para la seguridad de la Pontificia Universidad
          Catolica del Peru. Tres interfaces complementarias para toda la
          comunidad universitaria.
        </p>
      </div>

      <div className="relative z-10 space-y-3">
        {LOGIN_ACCESS_CARDS.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3"
          >
            <item.icon className="h-4 w-4 shrink-0 text-blue-200" />
            <div>
              <div className="text-sm font-semibold text-white">{item.label}</div>
              <div className="text-xs text-blue-300">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
