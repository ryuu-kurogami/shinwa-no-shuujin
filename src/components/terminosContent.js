// Contenido de los Términos y Condiciones. Para editar una cláusula, se
// cambia el texto acá — no hace falta tocar ningún componente. Cada
// elemento de "parrafos" es un string (párrafo simple) o un objeto
// { numero, texto } (cláusula numerada, como en el docx original).

export const terminosContent = {
  titulo: "Términos y Condiciones de Uso",
  subtitulo: "Shinwa no Shuujin (神話の集人)",
  ultimaActualizacion: "9 de agosto de 2026",
  enlaceRelacionado: { href: "/privacidad", texto: "Ver también la Política de Privacidad" },
  secciones: [
    {
      encabezado: "1. Introducción, Presentación y Aceptación",
      parrafos: [
        'Shinwa no Shuujin (神話の集人) ("la Plataforma", "el Sitio") es un espacio digital dedicado a la publicación y lectura de obras de ficción — relatos cortos, fragmentos, novelas y fanfics — creado y administrado por su fundador ("el Administrador", "nosotros").',
        "El Sitio nació del amor por la escritura y la lectura, y de la necesidad personal de su fundador de encontrar motivación para completar historias que, por distintas circunstancias de la vida, habían quedado inconclusas en otras plataformas. De esa búsqueda surgió la idea de construir un espacio propio, incorporando el misticismo como recurso narrativo y estético, buscando que el Sitio resulte lo más atractivo posible manteniendo, al mismo tiempo, la mayor simplicidad de uso.",
        "Actualmente, Shinwa no Shuujin es un proyecto administrado por una sola persona (ver Sección 11 para contacto). Este documento se refiere al Administrador en tercera persona y, en ocasiones, en plural institucional (\"nosotros\"), únicamente para contemplar la posibilidad de que en el futuro el equipo detrás del Sitio crezca — esto no implica que exista hoy un equipo mayor a una sola persona.",
        "El objetivo del Sitio no es generar ingresos, sino ofrecer una alternativa gratuita donde cualquier persona pueda leer y compartir buenas historias. Por esta misma razón existe también un espacio dedicado a fanfics, pensado para quienes buscan pasar un buen rato con relatos basados en universos que ya aman. Shinwa no Shuujin busca ser un punto de encuentro entre quienes disfrutan de la lectura y la escritura — un espacio de comunión alejado del ritmo caótico del día a día.",
        "Por este motivo, y como se detalla en la Sección 5, el Sitio opera y se declara expresamente como un proyecto sin fines de lucro.",
        "Al acceder, registrarte o utilizar cualquier función del Sitio, aceptás estos Términos y Condiciones en su totalidad. El tratamiento de tus datos personales se describe por separado en nuestra Política de Privacidad. Si no estás de acuerdo con alguna parte de estos documentos, te pedimos que no utilices la Plataforma.",
        "Estos términos pueden actualizarse con el tiempo (ver Sección 10). El uso continuado del Sitio después de una actualización implica la aceptación de los cambios.",
      ],
    },
    {
      encabezado: "2. Cuentas y Registro",
      parrafos: [
        { numero: "2.1.", texto: "Para publicar historias, comentar con tu nombre visible, guardar historias, seguir a otros autores o acceder a funciones personalizadas, es necesario crear una cuenta." },
        { numero: "2.2.", texto: "El registro puede realizarse mediante Google, Discord, o correo electrónico y contraseña (la opción de registro mediante Facebook está planificada, pero no se encuentra disponible actualmente). Al registrarte mediante un proveedor externo, cierta información básica puede ser compartida con la Plataforma según las políticas de dicho proveedor — ver Política de Privacidad." },
        { numero: "2.3.", texto: "Edad mínima: para crear una cuenta general en el Sitio, el usuario debe tener al menos 13 años. Los usuarios menores de 18 años no podrán acceder a las secciones marcadas como contenido para mayores de edad (ver Sección 4)." },
        { numero: "2.4.", texto: "Al crear tu cuenta se te va a pedir un nombre de usuario único, que usás para publicar y comentar de forma identificable. Sos responsable de mantener la confidencialidad de tus credenciales de acceso y de toda actividad realizada desde tu cuenta." },
      ],
    },
    {
      encabezado: "3. Contenido de los Usuarios",
      parrafos: [
        { numero: "3.1.", texto: "Categorías de contenido: las obras publicadas se organizan en relatos cortos/fragmentos, novelas largas, y fanfics (obras basadas en personajes, mundos o universos de propiedad de terceros), cada una en su sección correspondiente. Cualquier obra, sin importar la categoría, puede publicarse en uno o varios capítulos, según decida el autor." },
        { numero: "3.2.", texto: "Propiedad intelectual: el autor de una obra conserva todos los derechos de autor sobre su contenido original. Al publicar en la Plataforma, el autor otorga a Shinwa no Shuujin una licencia no exclusiva para almacenar, mostrar y distribuir dicha obra dentro del Sitio, únicamente con el fin de operar el servicio." },
        { numero: "3.3.", texto: "Declaración de autoría: al publicar, el autor declara bajo su responsabilidad que es el autor original de la obra o que cuenta con los derechos necesarios para publicarla (incluyendo, en el caso de fanfics, el entendimiento de que dicha obra se basa en propiedad intelectual de terceros y se publica sin fines de lucro — ver Sección 5.3)." },
        { numero: "3.4.", texto: "Etiquetas y géneros: cada obra debe clasificarse con las etiquetas y géneros correspondientes, para facilitar la búsqueda y garantizar que los lectores puedan filtrar contenido según sus preferencias." },
        { numero: "3.5.", texto: "Confidencialidad de borradores y contenido no publicado: el Administrador y cualquier colaborador con acceso técnico al backend de la Plataforma accederá a borradores u obras no publicadas únicamente cuando sea estrictamente necesario. Ningún borrador o contenido no publicado será copiado, compartido, distribuido, ni utilizado de ninguna manera sin el permiso explícito del autor correspondiente. Este compromiso incluye al propio fundador de la Plataforma. El procesamiento automatizado de datos (como copias de respaldo del proveedor de base de datos) no constituye acceso humano y no está sujeto a esta cláusula de la misma manera, aunque sí a la Política de Privacidad." },
        { numero: "3.6.", texto: "Retiro de contenido: el autor puede solicitar el retiro (despublicación o eliminación) de su obra del Sitio en el momento que lo considere conveniente, sin necesidad de justificar su decisión." },
      ],
    },
    {
      encabezado: "4. Sección para Mayores de Edad (+18)",
      parrafos: [
        { numero: "4.1.", texto: "El Sitio cuenta con una sección de contenido separada del resto, destinada exclusivamente a personas mayores de 18 años, que puede incluir lenguaje explícito, contenido sexual explícito entre personajes adultos, violencia intensa, y otras temáticas maduras." },
        { numero: "4.2.", texto: "Verificación de edad: al intentar acceder a esta sección, o a cualquier obra marcada como tal, se presentará una advertencia junto con una declaración de edad que el usuario deberá confirmar. El usuario declara, bajo su exclusiva responsabilidad, contar con la mayoría de edad legal en su país de residencia. El Administrador no se hace responsable por declaraciones falsas." },
        { numero: "4.3.", texto: "Prohibición absoluta: independientemente de la libertad creativa permitida en esta sección, queda terminantemente prohibido publicar, promover o describir: a) Contenido sexual que involucre o aluda a personajes menores de edad, bajo cualquier justificación; b) Contenido sexual no consensuado presentado de forma que lo promueva o glorifique, incluyendo medios sintéticos no consensuados (deepfakes); c) Violencia extrema gratuita presentada fuera de un contexto narrativo legítimo." },
        { numero: "4.4.", texto: "Al publicar una obra, o un capítulo nuevo de una obra ya marcada como +18, el autor debe confirmar mediante una declaración expresa que cumple con lo establecido en el punto 4.3." },
        { numero: "4.5.", texto: "Mientras la Plataforma mantenga un volumen reducido de usuarios, el Administrador podrá revisar manualmente el contenido enviado a esta sección antes de su publicación — tanto obras nuevas como capítulos nuevos de obras existentes. El incumplimiento de lo establecido en el punto 4.3 resulta en la eliminación inmediata del contenido y la suspensión permanente de la cuenta correspondiente, sin necesidad de aviso previo." },
      ],
    },
    {
      encabezado: "5. Donaciones",
      parrafos: [
        { numero: "5.1.", texto: "Donaciones a autores: los autores registrados pueden incluir en su perfil un enlace externo provisto por ellos mismos, a través del cual los lectores pueden realizar donaciones voluntarias como forma de apoyo. La Plataforma no procesa, gestiona ni tiene acceso a estas transacciones. El Administrador no asume ninguna responsabilidad sobre dichas transacciones." },
        { numero: "5.2.", texto: "Donaciones al Sitio: la Plataforma cuenta además con una sección de donaciones generales, destinadas exclusivamente al mantenimiento y mejora del Sitio. El Sitio publica de forma pública y actualizada (ver /transparencia) el monto total recibido, el destino de dichos fondos, y el monto que permanece reservado." },
        { numero: "5.3.", texto: "Restricción en fanfics y contenido +18: ningún enlace de apoyo económico puede estar activo mientras el autor tenga una obra de fanfic o marcada como contenido para mayores de edad publicada — los fanfics se basan en propiedad intelectual de terceros y no deben usarse con fines de lucro, y el contenido +18 requiere revisión previa (Sección 4.5). Esta restricción la aplica el Sitio de forma automática, y persiste aunque la obra se oculte o se pase a borrador — solo se levanta si la obra se elimina por completo. El enlace no se borra, queda guardado y se reactiva solo." },
        { numero: "5.4.", texto: "Naturaleza opcional y sin fines de lucro: tanto las donaciones a autores como las donaciones al Sitio son enteramente voluntarias y están pensadas para apoyar el contenido, no para venderlo. Queda prohibido condicionar la publicación de nuevos capítulos o contenido a algún tipo de pago dentro del Sitio. Cualquier acuerdo económico que un autor realice con lectores fuera de la Plataforma es de su exclusiva responsabilidad." },
      ],
    },
    {
      encabezado: "6. Comentarios",
      parrafos: [
        { numero: "6.1.", texto: "Solo los usuarios registrados pueden comentar. Podés hacerlo mostrando tu nombre de usuario real, o eligiendo el modo anónimo — en ambos casos el comentario queda asociado a tu cuenta internamente, para fines de moderación, aunque el nombre mostrado sea genérico." },
        { numero: "6.2.", texto: "Los comentarios se hacen sobre un capítulo puntual de una obra. Existen comentarios públicos, visibles para cualquier persona que acceda a ese capítulo, y comentarios privados, visibles únicamente para el autor de la obra." },
        { numero: "6.3.", texto: "Para prevenir spam y abuso, el Sitio aplica verificación mediante captcha y límites en la cantidad de comentarios que un mismo usuario o dirección IP puede publicar en un período de tiempo determinado." },
        { numero: "6.4.", texto: "El Administrador se reserva el derecho de eliminar cualquier comentario que infrinja estos Términos, sin necesidad de aviso previo." },
      ],
    },
    {
      encabezado: "7. Plagio y Contenido de Terceros",
      parrafos: [
        { numero: "7.1.", texto: "Disputas entre autores del Sitio: si dos autores registrados se acusan mutuamente de plagio, ambas partes deberán presentar evidencia que respalde su reclamo. El Administrador evaluará dicha evidencia y tomará una decisión final." },
        { numero: "7.2.", texto: "Obras de autores externos a la Plataforma: cualquier persona, tenga o no cuenta en el Sitio, puede reportar contenido publicado acá como una copia no autorizada de una obra externa, siempre que aporte evidencia razonable. Para evitar el uso indiscriminado de esta herramienta, cada reporte pasa por una verificación de captcha y tiene un límite de envíos por período de tiempo. El Administrador revisará el reporte y podrá retirar el contenido mientras dura la investigación." },
        { numero: "7.3.", texto: "El Sitio no verifica de forma proactiva la originalidad de todo el contenido publicado; actúa únicamente ante reportes con evidencia. Cada autor, al publicar, declara ser el autor original de su obra o contar con los derechos necesarios para publicarla (ver 3.3), asumiendo la responsabilidad primaria en caso de infracción." },
      ],
    },
    {
      encabezado: "8. Moderación y Sanciones",
      parrafos: [
        { numero: "8.1.", texto: "El Administrador se reserva el derecho de eliminar contenido, comentarios, o suspender cuentas que infrinjan estos Términos, incluyendo pero no limitado a: plagio confirmado, contenido prohibido en la sección +18, spam o abuso, y cualquier otra violación grave de estas normas." },
        { numero: "8.2.", texto: "Las infracciones relacionadas con contenido que involucre a menores de edad en contextos sexuales resultan en suspensión permanente e inmediata de la cuenta, sin excepciones ni proceso de apelación previo." },
      ],
    },
    {
      encabezado: "9. Limitación de Responsabilidad",
      parrafos: [
        { numero: "9.1.", texto: 'El Sitio se ofrece "tal cual", sin garantías de disponibilidad ininterrumpida. El Administrador no se hace responsable por interrupciones del servicio, pérdida de datos, o fallos técnicos, aunque hará su mejor esfuerzo por evitarlos.' },
        { numero: "9.2.", texto: "El Administrador no es responsable por el contenido publicado por los usuarios, ni por las transacciones de donación realizadas entre lectores y autores a través de enlaces externos." },
        { numero: "9.3.", texto: "Este documento se rige por las leyes de la República del Paraguay." },
      ],
    },
    {
      encabezado: "10. Cambios a los Términos",
      parrafos: [
        { numero: "10.1.", texto: "Estos Términos pueden actualizarse periódicamente. Los cambios significativos serán notificados mediante un aviso visible en el Sitio (ver la sección \"Qué se viene\" en /transparencia). La fecha de la última actualización figura al inicio de este documento." },
      ],
    },
    {
      encabezado: "11. Contacto",
      parrafos: [
        "Para consultas, reportes, o solicitudes relacionadas con estos Términos, podés contactar al Administrador a través del correo shinwanoshuujin@gmail.com.",
      ],
    },
  ],
};