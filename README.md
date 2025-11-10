# 🎵 Spotify Taste Mixer - Proyecto Final

Aplicación web que genera playlists personalizadas de Spotify basándose en las preferencias musicales del usuario mediante widgets configurables.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Configuración Inicial](#configuración-inicial)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Autenticación OAuth](#autenticación-oauth)
- [Widgets a Implementar](#widgets-a-implementar)
- [API de Spotify](#api-de-spotify)
- [Criterios de Evaluación](#criterios-de-evaluación)
- [Recursos Útiles](#recursos-útiles)

---

## 🎯 Objetivos del Proyecto

1. Crear una aplicación profesional con Next.js
2. Implementar autenticación OAuth 2.0 de forma segura
3. Trabajar con APIs externas (Spotify Web API)
4. Desarrollar componentes React reutilizables
5. Gestionar estado y persistencia con localStorage
6. Crear una interfaz responsive y atractiva

---

## 📦 Requisitos Previos

### Software Necesario

- Node.js 18+ y npm/yarn
- Git
- Editor de código (VS Code recomendado)
- Cuenta de Spotify (gratuita o premium)

### Conocimientos Requeridos

- React básico (componentes, props, hooks)
- NextJS
- JavaScript ES6+
- Tailwind y CSS básico
- Conceptos de HTTP y APIs REST

---

## ⚙️ Configuración Inicial

### 1. Crear Aplicación en Spotify

1. Ve a [Spotify for Developers](https://developer.spotify.com/dashboard)
2. Inicia sesión con tu cuenta de Spotify
3. Haz clic en **"Create app"**
4. Completa el formulario:
   - **App name**: Spotify Taste Mixer
   - **App description**: Generador de playlists personalizadas
   - **Redirect URI**: `http://localhost:3000/auth/callback`
   - **API/SDKs**: Web API
5. Guarda tu **Client ID** y **Client Secret**

### 2. Crear Proyecto Next.js

```bash
npx create-next-app@latest spotify-taste-mixer
cd spotify-taste-mixer
npm run dev
```

Configuración recomendada:
- ✅ TypeScript: No 
- ✅ ESLint: Yes
- ✅ Tailwind CSS: Yes
- ✅ App Router: Yes
- ✅ Import alias: Yes (@/*)

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
SPOTIFY_CLIENT_ID=tu_client_id_aqui
SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback
```

⚠️ **IMPORTANTE**: 
- Nunca subas `.env.local` a GitHub
- El archivo `.gitignore` ya lo excluye por defecto
- Solo las variables con `NEXT_PUBLIC_` son accesibles en el cliente

### 4. Instalar Dependencias (Opcional)

```bash
npm install axios
```

---

## 📁 Estructura ejemplo del Proyecto

```
spotify-taste-mixer/src/
├── app/
│   ├── page.js                    # Página de inicio / login
│   ├── layout.js                  # Layout principal
│   ├── dashboard/
│   │   └── page.js                # Dashboard con widgets
│   ├── auth/
│   │   └── callback/
│   │       └── page.js            # Callback OAuth
│   └── api/
│       ├── spotify-token/
│       │   └── route.js           # Intercambio código por token
│       └── refresh-token/
│           └── route.js           # Refrescar token expirado
├── components/
│   ├── widgets/
│   │   ├── ArtistWidget.jsx       # Widget de artistas
│   │   ├── GenreWidget.jsx        # Widget de géneros
│   │   ├── DecadeWidget.jsx       # Widget de décadas
│   │   ├── MoodWidget.jsx         # Widget de mood/energía
│   │   └── PopularityWidget.jsx   # Widget de popularidad
│   ├── PlaylistDisplay.jsx        # Visualización de playlist
│   ├── TrackCard.jsx              # Tarjeta de canción
│   └── Header.jsx                 # Navegación y logout
├── lib/
│   ├── spotify.js                 # Funciones API Spotify
│   └── auth.js                    # Utilidades de autenticación
├── .env.local                     # Variables de entorno
└── README.md
```

---

## 🔐 Autenticación OAuth

### Flujo de Autenticación

```
Usuario → Login → Spotify OAuth → Callback → Token Exchange → Dashboard
```

### Código Proporcionado

#### 1. API Route: `src/app/api/spotify-token/route.js`

#### 2. API Route: `src/app/api/refresh-token/route.js`

#### 3. Utilidad de Auth: `src/lib/auth.js`

#### 4. Página de Login: `app/page.js`

#### 5. Página de Callback: `app/auth/callback/page.js`

## 🧩 Widgets a Implementar

### Requisitos Generales para Widgets

Cada widget debe:
1. Ser un componente React independiente
2. Recibir props: `onSelect`, `selectedItems`
3. Emitir cambios al componente padre
4. Tener un diseño responsive
5. Mostrar estado de carga cuando haga peticiones

## 📡 API de Spotify - Referencia Rápida

### Headers Requeridos

```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### Endpoints Principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/me` | GET | Obtener perfil del usuario |
| `/search` | GET | Buscar artistas/tracks/albums |
| `/artists/{id}/top-tracks` | GET | Top tracks de un artista |
| `/me/top/artists` | GET | Artistas más escuchados |
| `/me/top/tracks` | GET | Canciones más escuchadas |
| `/users/{user_id}/playlists` | POST | Crear playlist |
| `/playlists/{playlist_id}/tracks` | POST | Añadir canciones a playlist |

### Ejemplos de Búsqueda

```javascript
// Buscar artistas
const url = `https://api.spotify.com/v1/search?type=artist&q=radiohead&limit=5`;

// Buscar tracks
const url = `https://api.spotify.com/v1/search?type=track&q=bohemian%20rhapsody&limit=10`;

// Buscar por género (limitado)
const url = `https://api.spotify.com/v1/search?type=track&q=genre:jazz&limit=20`;
```

### Manejo de Errores

```javascript
async function spotifyRequest(url) {
  const token = getAccessToken();
  
  if (!token) {
    // Intentar refrescar token
    const newToken = await refreshAccessToken();
    if (!newToken) {
      // Redirigir a login
      window.location.href = '/';
      return;
    }
  }

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.status === 401) {
    // Token expirado, refrescar
    const newToken = await refreshAccessToken();
    // Reintentar petición
  }

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
```

## 🐛 Problemas Comunes y Soluciones

### Error: "Invalid client"

**Problema**: Client ID o Client Secret incorrectos

**Solución**: Verifica `.env.local` y reinicia el servidor de desarrollo

### Error: "Invalid redirect URI"

**Problema**: La URI de callback no coincide con la configurada en Spotify

**Solución**: Asegúrate que en el dashboard de Spotify esté `http://localhost:3000/auth/callback`

### Error: "The access token expired"

**Problema**: Token expirado (válido por 1 hora)

**Solución**: Implementa refresh token automático:

```javascript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  
  const response = await fetch('/api/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  const data = await response.json();
  
  localStorage.setItem('spotify_token', data.access_token);
  const expirationTime = Date.now() + data.expires_in * 1000;
  localStorage.setItem('spotify_token_expiration', expirationTime.toString());
  
  return data.access_token;
}
```

### localStorage is not defined

**Problema**: Intentando usar localStorage en componente de servidor

**Solución**: Añade `'use client'` al inicio del archivo del componente

### CORS Error

**Problema**: Peticiones bloqueadas por CORS

**Solución**: Usa API Routes para peticiones sensibles, o asegúrate de incluir el token correctamente

---

## 📚 Recursos Útiles

### Documentación Oficial

- [Next.js Documentation](https://nextjs.org/docs)
- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api)
- [Spotify OAuth Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [React Hooks](https://react.dev/reference/react)

### Tutoriales Recomendados

- [Next.js App Router Tutorial](https://nextjs.org/learn)
- [OAuth 2.0 Explained](https://auth0.com/docs/get-started/authentication-and-authorization-flow)
- [Tailwind CSS Tutorial](https://tailwindcss.com/docs)

### Herramientas de Desarrollo

- [Postman](https://www.postman.com/) - Para probar endpoints de Spotify
- [React Developer Tools](https://react.dev/learn/react-developer-tools)
- [Spotify API Console](https://developer.spotify.com/console/) - Para probar peticiones

---

## 🎨 Inspiración de Diseño

### Referencias de UI

- [Spotify Design](https://spotify.design/)
- [Dribbble - Music Apps](https://dribbble.com/search/music-app)
- [Awwwards - Music Websites](https://www.awwwards.com/websites/music/)

### Paletas de Colores Sugeridas

```css
/* Spotify Inspired */
--primary: #1DB954;
--secondary: #191414;
--accent: #1ed760;

/* Dark Mode */
--bg-dark: #121212;
--bg-card: #181818;
--text-primary: #FFFFFF;
--text-secondary: #B3B3B3;
```


## 💡 Ideas para Mejorar la Nota

1. **Guardar playlist en Spotify**: Implementar guardado real
2. **Historial de playlists**: Guardar playlists generadas anteriormente
3. **Compartir playlist**: Generar link para compartir
4. **Modo oscuro/claro**: Toggle entre temas
5. **Estadísticas**: Mostrar insights sobre la música generada
6. **Preview de canciones**: Reproducir fragmentos de 30s
7. **Drag & Drop**: Reordenar canciones de la playlist
8. **Exportar**: Descargar playlist como JSON/CSV
9. **Filtros avanzados**: Tempo, acousticness, danceability
10. **Tests unitarios**: Jest + React Testing Library



## 📝 Notas Finales

- **Tiempo estimado**: 30-40 horas
- **Dificultad**: Media-Alta
- **Este es un proyecto real** que puedes incluir en tu portfolio
- **No copies código sin entenderlo**: asegúrate de comprender cada parte
- **Empieza temprano**: el OAuth puede tomar tiempo en configurarse
- **Prueba frecuentemente**: no esperes al final para probar la integración

---

¡Buena suerte y disfruta creando tu Spotify Taste Mixer! 🎉🎵