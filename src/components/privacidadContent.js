// Política de Privacidad — documento nuevo, separado de los Términos.
// Mismo formato que terminosContent.js: cada parrafo es un string o un
// objeto { numero, texto }.

export const privacidadContent = {
  titulo: "Política de Privacidad",
  subtitulo: "Shinwa no Shuujin (神話の集人)",
  ultimaActualizacion: "5 de agosto de 2026",
  enlaceRelacionado: { href: "/terminos", texto: "Ver también los Términos y Condiciones" },
  secciones: [
    {
      encabezado: "1. Introducción",
      parrafos: [
        "Esta Política de Privacidad explica qué datos personales recolecta Shinwa no Shuujin (神話の集人) (\"el Sitio\"), para qué se usan, con quién se comparten, y qué derechos tenés sobre ellos. Complementa a los Términos y Condiciones, no los reemplaza.",
        "El Sitio es administrado por una sola persona (\"el Administrador\") — ver Sección 8 para contacto.",
      ],
    },
    {
      encabezado: "2. Qué datos recolectamos",
      parrafos: [
        { numero: "2.1.", texto: "Datos de cuenta: al registrarte, recolectamos tu nombre, correo electrónico y, según el método de registro elegido, tu foto de perfil. Vos además elegís un nombre de usuario público al crear la cuenta." },
        { numero: "2.2.", texto: "Datos de perfil opcionales: bio, avatar y link de donación, si decidís cargarlos." },
        { numero: "2.3.", texto: "Dirección IP: se registra al comentar, con el único fin de prevenir spam y hacer cumplir los límites de uso (ver Términos, Sección 6.3)." },
        { numero: "2.4.", texto: "Datos técnicos guardados en tu navegador (no en nuestros servidores): usamos almacenamiento local del navegador (localStorage) para recordar si ya aceptaste el ingreso al Sitio, si ya confirmaste ser mayor de edad, y para el funcionamiento de la verificación de captcha. Esta información vive únicamente en tu propio dispositivo y no la recolectamos nosotros." },
        { numero: "2.5.", texto: "No recolectamos datos de pago: las donaciones (a autores o al Sitio) se procesan íntegramente en servicios externos elegidos por cada autor o por el Sitio — nunca vemos ni almacenamos información de tarjetas ni cuentas bancarias." },
      ],
    },
    {
      encabezado: "3. Para qué usamos tus datos",
      parrafos: [
        "Exclusivamente para operar el Sitio: crear y gestionar tu cuenta, mostrar tu contenido y el de otros, prevenir spam y abuso, aplicar moderación cuando corresponde, y comunicarnos con vos si es necesario (por ejemplo, ante un reporte sobre tu cuenta). No usamos tus datos con fines publicitarios ni los vendemos a terceros.",
      ],
    },
    {
      encabezado: "4. Con quién se comparten tus datos",
      parrafos: [
        "El Sitio utiliza los siguientes proveedores externos para funcionar, cada uno con su propia política de privacidad:",
        { numero: "•", texto: "Supabase — base de datos y autenticación." },
        { numero: "•", texto: "Vercel — alojamiento del sitio." },
        { numero: "•", texto: "Cloudinary — alojamiento de imágenes (portadas y avatares)." },
        { numero: "•", texto: "Cloudflare (Turnstile) — verificación de que no sos un bot al comentar." },
        "Ninguno de estos proveedores tiene permiso para usar tus datos fuera del funcionamiento del Sitio.",
      ],
    },
    {
      encabezado: "5. Cuánto tiempo conservamos tus datos",
      parrafos: [
        { numero: "5.1.", texto: "Mientras tu cuenta esté activa, conservamos tus datos para que el Sitio funcione con normalidad." },
        { numero: "5.2.", texto: "Si pedís borrar tu cuenta (ver Sección 6.3), tus datos entran en un período de gracia de 60 días, durante el cual podés arrepentirte e iniciar sesión para recuperarla. Mientras dura ese período, tu cuenta queda suspendida — no podés usar el Sitio hasta que canceles el borrado." },
        { numero: "5.3.", texto: "Pasados los 60 días sin que canceles el borrado, el proceso es definitivo y automático: tus historias se eliminan, y tus comentarios se anonimizan por completo — se reemplazan tanto el nombre como el texto (no se conserva contenido real asociado a vos), y tu cuenta se borra de nuestro sistema de autenticación. Este proceso no puede revertirse una vez completado." },
      ],
    },
    {
      encabezado: "6. Tus derechos",
      parrafos: [
        { numero: "6.1.", texto: "Acceso y rectificación: podés ver y corregir tus datos de perfil (username, bio, avatar, link de donación) en cualquier momento desde tu propio perfil." },
        { numero: "6.2.", texto: "Portabilidad: si necesitás una copia de tus datos, podés solicitarla escribiendo al correo de contacto (Sección 8)." },
        { numero: "6.3.", texto: "Borrado: podés pedir la eliminación de tu cuenta y tus datos personales en cualquier momento desde tu perfil. El proceso y sus plazos están descriptos en la Sección 5.2 y 5.3 de este documento." },
        { numero: "6.4.", texto: "Estos derechos no aplican a datos que ya fueron anonimizados (como comentarios de una cuenta borrada) ni a copias de respaldo técnicas de corta duración que puedan existir por razones de continuidad del servicio." },
      ],
    },
    {
      encabezado: "7. Menores de edad",
      parrafos: [
        "La edad mínima para crear una cuenta es 13 años (ver Términos, Sección 2.3). Los usuarios menores de 18 años no pueden acceder a la sección de contenido para mayores de edad del Sitio (ver Términos, Sección 4).",
      ],
    },
    {
      encabezado: "8. Contacto y cambios a esta política",
      parrafos: [
        "Esta política puede actualizarse con el tiempo; los cambios significativos se avisan en la sección \"Qué se viene\" de /transparencia. Para cualquier consulta sobre tus datos o esta política, escribí a shinwanoshuujin@gmail.com.",
      ],
    },
  ],
};