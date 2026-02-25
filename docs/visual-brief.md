# Visual Brief — Aux

## Personalidad

**Retro-musical, calido, social, con caracter, dark-first.**

La sensacion de un club de musica entre amigos: cercano y divertido, pero con una estetica cuidada. Inspirado en la era dorada del vinilo y los cassettes, pero con UI moderna y limpia. Dark mode como experiencia principal (como Spotify/Apple Music).

## Publico objetivo

Grupos de amigos (20-35 anos) que comparten musica constantemente por WhatsApp pero quieren un espacio dedicado donde aportar canciones, votarlas y ver quien tiene mejor gusto musical. Usan plataformas distintas (Spotify, YouTube Music) y necesitan links cross-platform.

## Paleta de colores

### Dark theme (principal)

| Token            | Hex                        | Uso                                                 |
| ---------------- | -------------------------- | --------------------------------------------------- |
| `bg-primary`     | `#0A0A0A`                  | Fondo principal                                     |
| `bg-secondary`   | `#141414`                  | Fondo de cards, sidebar                             |
| `bg-tertiary`    | `#1E1E1E`                  | Fondo inputs, hovers                                |
| `border`         | `#2A2A2A`                  | Bordes de cards, divisores                          |
| `text-primary`   | `#EDEDED`                  | Texto principal                                     |
| `text-secondary` | `#A3A3A3`                  | Texto secundario, labels                            |
| `text-tertiary`  | `#666666`                  | Placeholders, hints                                 |
| `primary`        | `#3291FF`                  | brand-blue dark — acciones principales, CTAs        |
| `accent`         | `#D946EF`                  | Fuchsia — color tematico de Aux, badges, highlights |
| `accent-soft`    | `rgba(217, 70, 239, 0.12)` | Fuchsia translucido — fondos sutiles                |
| `star`           | `#FBBF24`                  | Amber/gold — estrellas de votacion, retro feel      |
| `star-empty`     | `#333333`                  | Estrellas vacias                                    |
| `spotify`        | `#1DB954`                  | Boton "Abrir en Spotify"                            |
| `youtube`        | `#FF0000`                  | Boton "Abrir en YouTube Music"                      |
| `success`        | `#22C55E`                  | Confirmaciones                                      |
| `warning`        | `#F59E0B`                  | Alertas                                             |
| `error`          | `#EF4444`                  | Errores                                             |

### Light theme

| Token            | Hex       | Uso              |
| ---------------- | --------- | ---------------- |
| `bg-primary`     | `#FFFFFF` | Fondo principal  |
| `bg-secondary`   | `#FAFAFA` | Fondo de cards   |
| `bg-tertiary`    | `#F5F5F5` | Fondo inputs     |
| `border`         | `#E5E5E5` | Bordes           |
| `text-primary`   | `#171717` | Texto principal  |
| `text-secondary` | `#525252` | Texto secundario |
| `text-tertiary`  | `#A3A3A3` | Placeholders     |
| `primary`        | `#0070F3` | brand-blue light |
| `accent`         | `#D946EF` | Fuchsia          |
| `star`           | `#F59E0B` | Amber            |

## Tipografia

- **Headings:** Geist Sans — 600 (semibold), 700 (bold)
- **Body:** Geist Sans — 400 (regular), 500 (medium)
- **Mono:** Geist Mono — 400 (para codigos de grupo)

### Escala

| Token  | Size | Line Height | Uso                |
| ------ | ---- | ----------- | ------------------ |
| `xs`   | 12px | 16px        | Captions, badges   |
| `sm`   | 14px | 20px        | Labels, metadata   |
| `base` | 16px | 24px        | Body text          |
| `lg`   | 18px | 28px        | Lead text          |
| `xl`   | 20px | 28px        | H4, section titles |
| `2xl`  | 24px | 32px        | H3                 |
| `3xl`  | 30px | 36px        | H2                 |
| `4xl`  | 36px | 40px        | H1, hero           |

## Iconografia

- **Set:** Lucide Icons
- **Estilo:** outlined, 1.5px stroke
- **Tamano base:** 20px UI, 16px inline, 24px navegacion

## Referencias visuales

- **Spotify** — Dark UI, cards con caratulas prominentes, jerarquia visual
- **Apple Music** — Caratulas grandes, tipografia limpia sobre fondo oscuro
- **Tricount** — Simplicidad de uso, modelo sin auth, links compartibles
- **Toque retro** — Vinyl grooves, amber/gold accents, calidez dentro del dark mode

## Elementos retro

El caracter retro NO viene de la tipografia (Geist es moderna y se mantiene), sino de:

- **Color amber/gold** para las estrellas de votacion (evoca musica clasica, premios, vinilos)
- **Caratulas prominentes** en cards de canciones (la portada del album es el centro visual)
- **Formas circulares** para avatares y elementos decorativos (referencia al vinilo)
- **Gradiente sutil fuchsia-to-purple** solo en el hero de landing (unico lugar con gradiente)
- **Nomenclatura**: "Ronda" en vez de "Semana", evocando turnos de DJ

## Notas

- Dark mode es la experiencia PRINCIPAL, light mode existe pero no es la referencia de diseno
- Mobile-first: la experiencia primaria es en movil (compartir links desde el telefono)
- Lab product: topbar horizontal, no sidebar
- El fuchsia es accent, brand-blue sigue siendo el primary para acciones (per IDENTITY.md)
- NO embeds de reproduccion — solo links externos con botones de plataforma
