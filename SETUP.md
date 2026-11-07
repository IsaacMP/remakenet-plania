# Cómo poner Plania en marcha

Guía paso a paso para conectar la app con sus servicios y probarla en tu celular.
Tiempo aproximado: 1 a 2 horas la primera vez.

> **Estado actual:** el proyecto de Supabase de RemakeNet ya tiene las tablas y las funciones publicadas, y el `.env` tiene su URL y su llave pública. Lo que falta es la llave de la IA (paso 3) y Google (paso 2).

Necesitas cuentas en:

| Servicio | Para qué | Costo para empezar |
| --- | --- | --- |
| [Supabase](https://supabase.com) | Base de datos, cuentas de usuario, archivos y servidor | Gratis |
| [Google Cloud](https://console.cloud.google.com) | Iniciar sesión con Google | Gratis |
| [Google AI Studio](https://aistudio.google.com) | IA para desarrollo (Gemini) | Gratis con límite diario |
| [Anthropic](https://console.anthropic.com) | IA para el lanzamiento (Claude) | Pago por uso (ver abajo) |
| [Expo / EAS](https://expo.dev) | Compilar la app para Android e iOS | Gratis (con límite de compilaciones al mes) |
| Google Play Console | Publicar en Android | USD 25, una sola vez |
| Apple Developer Program | Publicar en iOS | USD 99 al año |

---

## 1. Supabase

1. Crea un proyecto nuevo en Supabase. Región recomendada para México: `us-east-1` o `us-west-1`.
2. Instala la CLI y conéctala al proyecto:

   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref TU-PROJECT-REF
   ```

3. Crea las tablas, la seguridad y el espacio para archivos:

   ```bash
   supabase db push
   ```

4. Guarda la llave de la IA como secreto del servidor (nunca va en la app). Ver el paso 3.

5. Publica las funciones del servidor:

   ```bash
   npm run functions:deploy
   ```

6. Copia la **Project URL** y la **anon / publishable key** (Project Settings → API) a tu archivo `.env` (ver paso 4).

> **Tiempo de las funciones:** generar el material de un documento suele tardar de 30 a 90 segundos. El plan gratis de Supabase permite hasta 150 s por función; el plan Pro, 400 s. Si muchos documentos largos fallan con "Algo falló al preparar tu material", sube de plan o baja el límite de páginas en `supabase/functions/_shared/plans.ts`.

## 2. Google (inicio de sesión)

En Google Cloud Console → **APIs & Services**:

1. **OAuth consent screen**: tipo *External*, nombre "Plania", correo de soporte, logo (`assets/images/icon.png`) y los dominios de tu sitio. Agrega los scopes `email` y `profile`.
2. **Credentials → Create credentials → OAuth client ID**, crea tres:
   - **Web application**: este es el `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. En *Authorized redirect URIs* agrega `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
   - **iOS**: Bundle ID `com.remakenet.plania`. Este es el `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
   - **Android**: Package `com.remakenet.plania` y la huella **SHA-1**. La SHA-1 la obtienes después de la primera compilación con `npx eas-cli@latest credentials` (elige Android → la *keystore* de tu build). Cuando subas a Google Play, agrega también la SHA-1 de "App signing" que te da Play Console.
3. En Supabase → **Authentication → Sign In / Providers → Google**:
   - Actívalo.
   - En *Client IDs* pega el Web client ID y el iOS client ID separados por coma (primero el Web).
   - Pega el *Client secret* del cliente Web.
   - Activa **Skip nonce check** (lo necesita el inicio de sesión nativo en iOS).

## 3. La IA: Gemini para desarrollo, Claude para lanzar

El servidor puede usar dos proveedores. Se elige con el secreto `AI_PROVIDER` en Supabase → **Edge Functions → Secrets**. El código de los dos está en `supabase/functions/_shared/ai.ts`.

| `AI_PROVIDER` | Proveedor | Llave que necesita | Costo |
| --- | --- | --- | --- |
| `gemini` (o vacío) | Google Gemini | `GEMINI_API_KEY` | Nivel gratis con límite diario |
| `claude` | Claude de Anthropic | `ANTHROPIC_API_KEY` | De pago por uso |

### Ahora: Gemini gratis

1. Entra a [aistudio.google.com](https://aistudio.google.com) con tu cuenta de Google → **Get API key** → **Create API key**.
2. En Supabase → **Edge Functions → Secrets** agrega `GEMINI_API_KEY` con esa llave.
3. Listo: si `AI_PROVIDER` no existe, se usa Gemini.

El modelo por defecto es `gemini-flash-latest` (el Flash vigente de Google). Para fijar otro, agrega el secreto `GEMINI_MODEL`.

> **Importante:** en el nivel gratis, Google puede usar el contenido que recibe para mejorar sus productos. Úsalo para probar con tus propios documentos. Antes de abrir la app a alumnos reales, cambia a Claude o al nivel de pago de Gemini, y menciónalo en tu aviso de privacidad. Los límites gratis los ves en AI Studio; si se acaban, la app muestra "Hay mucha demanda ahora mismo".

### Después: Claude

1. En console.anthropic.com compra créditos (**Billing**), pon un tope mensual (**Billing → Limits**) y crea una llave (**API Keys**). El plan Pro de claude.ai no incluye créditos de API.
2. En Supabase → **Edge Functions → Secrets** agrega `ANTHROPIC_API_KEY` y cambia `AI_PROVIDER` a `claude`. No hay que volver a publicar nada.

Costo de referencia con `claude-opus-5-5` (USD 4 por millón de tokens de entrada, USD 20 por millón de salida): un PDF de 20 páginas usa unos 40 000 a 60 000 tokens de entrada y 10 000 a 15 000 de salida, o sea **USD 0.40 a 0.55 por documento**. Con `CLAUDE_MODEL=claude-haiku-5-5` baja a alrededor de 1 centavo; con `claude-sonnet-5-5`, a la mitad. Compara la calidad de los exámenes antes de decidir. El tope de Pro (100 generaciones al mes) existe para que un usuario extremo no cueste más de lo que paga.

Con Claude, el servidor activa el respaldo automático: si el modelo rechaza un documento por sus políticas, Anthropic reintenta con su modelo de respaldo recomendado en la misma llamada (`fallbacks: "default"`).

## 4. Archivo `.env`

```bash
cp .env.example .env
```

Llena los cuatro valores. Son públicos (van dentro de la app), así que nunca pongas ahí la llave de Anthropic ni la *service role key* de Supabase.

Para las compilaciones en la nube, los mismos valores públicos ya están en `eas.json` (sección `env` de cada perfil). Si cambias de proyecto de Supabase o de clientes de Google, actualízalos ahí también.

## 5. Probar en tu celular

Google Sign-In usa código nativo, así que **no funciona en Expo Go**: necesitas una *development build* (una versión de prueba de Plania con tu código).

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init            # crea el proyecto en Expo y guarda el projectId
npm run build:dev                  # compila Android e iOS en la nube (~15 min)
```

Instala en tu celular lo que te da EAS (en Android, un enlace al APK; en iOS necesitas registrar el dispositivo con `npx eas-cli@latest device:create`). Luego:

```bash
npm start
```

Abre la app Plania de prueba y escanea el QR. Los cambios de código se ven al instante.

## 6. Antes de subir a las tiendas

- [ ] **Aviso de privacidad y términos**: publícalos en tu sitio (por ejemplo `plania.app/privacidad`) y cambia el texto de `auth.legal` en `src/locales/*.ts` por enlaces. Las tiendas lo exigen. Menciona que los documentos se procesan con un proveedor de IA (Anthropic) y que se guardan en Supabase.
- [ ] **Borrar cuenta**: ya está en Perfil → "Borrar mi cuenta" (Apple y Google lo exigen).
- [ ] **Google Play → Data safety**: declara correo, nombre, foto de perfil y archivos subidos por el usuario.
- [ ] **Edad**: el público es de 15 a 25 años. Configura la clasificación como "13+" o "Teen" y no marques la app como "para niños", porque eso agrega requisitos extra.
- [ ] **Capturas de pantalla**: 6.7" para iPhone y teléfono para Android.
- [ ] Compila para producción y súbela:

  ```bash
  npx eas-cli@latest build --profile production --platform all
  npx eas-cli@latest submit --platform all
  ```

## 7. Activar los pagos de Pro (cuando toque)

Todo está preparado y apagado. Los pasos están en `src/lib/purchases.ts`. En resumen:

1. Crea los productos `plania_pro_monthly` (MXN 89) y `plania_pro_yearly` (MXN 699) en App Store Connect y Google Play.
2. Conéctalos a [RevenueCat](https://www.revenuecat.com) con un entitlement llamado `pro`.
3. Publica el webhook y guarda su secreto:

   ```bash
   supabase secrets set REVENUECAT_WEBHOOK_SECRET=una-cadena-larga-y-aleatoria
   ```

   En RevenueCat → Integrations → Webhooks usa `https://TU-PROYECTO.supabase.co/functions/v1/revenuecat-webhook` con el header `Authorization: Bearer <ese secreto>`.
4. Instala `react-native-purchases`, completa las funciones de `src/lib/purchases.ts` y cambia `PURCHASES_ENABLED` a `true`.

El cupón de 65% (`PLANIA65-XXXXXX`) se guarda en `profiles.coupon_code`. Al lanzar Pro, crea una oferta promocional en cada tienda y envía el código por correo a la lista de espera:

```sql
select w.email, p.coupon_code, w.locale
from waitlist w join profiles p on p.id = w.user_id
where w.with_coupon
group by w.email, p.coupon_code, w.locale;
```

## Problemas comunes

| Síntoma | Causa probable |
| --- | --- |
| "Falta configurar Supabase y Google…" | El `.env` está vacío o no reiniciaste `npm start`. |
| `DEVELOPER_ERROR` al iniciar sesión en Android | Falta la SHA-1 correcta en el cliente Android de Google Cloud. |
| Inicio de sesión en iOS falla en silencio | No activaste "Skip nonce check" o falta el iOS client ID en Supabase. |
| Un documento se queda "leyendo" para siempre | La función excedió su tiempo. Revisa los logs en Supabase → Edge Functions → process-document. A los 6 minutos se puede reintentar. |
| "No pudimos abrir este archivo" | El .docx/.pptx está dañado o es un formato antiguo (.doc/.ppt). |
