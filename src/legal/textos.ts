// Textos legales de Míster. Los datos del titular se rellenan una sola vez en TITULAR.
// Son una base redactada para esta app; conviene que los revise un profesional antes de publicarla.

export const TITULAR = {
  nombre: "Aday Román Martín",
  correo: "adayrm.2003@gmail.com"
};

export const ACTUALIZADO = "8 de noviembre de 2026";

export interface Seccion { titulo: string; parrafos: string[] }
export interface DocumentoLegal { id: string; titulo: string; resumen: string; secciones: Seccion[] }

const t = TITULAR;

export const DOCUMENTOS: DocumentoLegal[] = [
  {
    id: "terminos",
    titulo: "Términos de uso",
    resumen: "Las normas para usar Míster: cuentas, uso correcto y responsabilidades.",
    secciones: [
      { titulo: "1. Quién presta el servicio", parrafos: [
        `Míster es una aplicación para clubes y entrenadores de fútbol ofrecida por ${t.nombre}. Contacto: ${t.correo}.`,
        "Al crear una cuenta o usar la app aceptas estos términos. Si no estás de acuerdo, no uses la app."
      ] },
      { titulo: "2. Qué es Míster", parrafos: [
        "Sirve para organizar la plantilla, las alineaciones, los ejercicios, las sesiones, el calendario, la asistencia, los partidos y las estadísticas de los equipos de un club.",
        "Hay dos tipos de cuenta: la de la directiva, que crea los equipos del club y asigna a los entrenadores, y la de entrenador, que trabaja con los equipos que le asigna su club."
      ] },
      { titulo: "3. Cuentas", parrafos: [
        "Para usar Míster necesitas una cuenta con un correo electrónico tuyo y una contraseña. Debes ser mayor de edad para crear una cuenta.",
        "Eres responsable de guardar tu contraseña y de lo que se haga con tu cuenta. Si crees que alguien la está usando sin permiso, cambia la contraseña y avísanos.",
        "La directiva es responsable de asignar los equipos solo a las personas que de verdad entrenan en el club y de quitarles el acceso cuando dejen de hacerlo."
      ] },
      { titulo: "4. Uso correcto", parrafos: [
        "Te comprometes a usar Míster solo para la gestión deportiva del club y a respetar la ley y los derechos de los demás.",
        "En la app solo se guardan los datos de los jugadores necesarios para entrenar: nombre o mote, pierna buena, posición, dorsal, asistencia, minutos, goles y tarjetas. No está permitido introducir datos de salud, fotos, documentos de identidad, teléfonos, direcciones ni ningún otro dato personal en los campos de notas.",
        "No está permitido intentar acceder a datos de otros clubes o equipos, alterar el funcionamiento de la app ni usarla para fines distintos a los previstos."
      ] },
      { titulo: "5. Contenido que introduces", parrafos: [
        "Los ejercicios, sesiones, alineaciones, notas y demás información que introduces siguen siendo tuyos o de tu club. Nos das permiso para guardarlos y mostrarlos dentro de la app únicamente para prestarte el servicio.",
        "Eres responsable de tener derecho a usar el contenido que subes y de que los datos de los jugadores se traten conforme a la Política de privacidad."
      ] },
      { titulo: "6. Disponibilidad y cambios", parrafos: [
        "Intentamos que Míster funcione siempre, pero puede haber interrupciones por mantenimiento, fallos técnicos o causas ajenas a nosotros.",
        "Podemos mejorar o cambiar funciones de la app. Si cambiamos estos términos de forma importante, te lo avisaremos dentro de la app antes de que se apliquen."
      ] },
      { titulo: "7. Responsabilidad", parrafos: [
        "Míster es una herramienta de apoyo. Las decisiones deportivas y el cuidado de los jugadores son responsabilidad del club y de sus entrenadores.",
        "No respondemos de daños causados por un uso de la app contrario a estos términos, por la información introducida por los usuarios ni por causas de fuerza mayor. Nada de lo anterior limita los derechos que la ley te reconoce como consumidor."
      ] },
      { titulo: "8. Baja", parrafos: [
        `Puedes dejar de usar Míster cuando quieras y pedir que borremos tu cuenta escribiendo a ${t.correo}. Podemos suspender una cuenta que incumpla estos términos.`
      ] },
      { titulo: "9. Ley aplicable", parrafos: [
        "Estos términos se rigen por la ley española. Para cualquier conflicto serán competentes los juzgados y tribunales que correspondan según la ley; si eres consumidor, los de tu domicilio."
      ] }
    ]
  },
  {
    id: "privacidad",
    titulo: "Política de privacidad",
    resumen: "Qué datos se guardan, para qué, dónde y cómo ejercer tus derechos.",
    secciones: [
      { titulo: "1. Quién trata los datos", parrafos: [
        `Datos de las cuentas (directiva y entrenadores): el responsable es ${t.nombre}. Contacto para privacidad y para ejercer tus derechos: ${t.correo}.`,
        "Datos de los jugadores y de la actividad de cada equipo: el responsable es el club que los introduce en la app. El titular de Míster actúa como encargado del tratamiento: guarda esos datos por cuenta del club, solo para prestarle el servicio y siguiendo sus instrucciones."
      ] },
      { titulo: "2. Qué datos se guardan", parrafos: [
        "De las cuentas: correo electrónico, contraseña (guardada cifrada, nadie puede leerla), tipo de cuenta, nombre del club y los equipos asignados.",
        "De los jugadores, y nada más: nombre o mote, pierna buena, posición, dorsal y unas notas deportivas opcionales. Además, lo que el entrenador apunta de la actividad: asistencia a entrenamientos, alineaciones, minutos, goles, asistencias y tarjetas.",
        "Míster no pide ni guarda fechas de nacimiento, fotos, documentos de identidad, teléfonos, direcciones ni datos de salud de los jugadores. Las notas no deben usarse para ese tipo de datos.",
        "Del rival solo se guarda el nombre del equipo y, en las tarjetas, el dorsal del jugador, sin nombres."
      ] },
      { titulo: "3. Menores de edad", parrafos: [
        "La mayoría de los jugadores son menores. Por eso la app está diseñada para guardar el mínimo de datos posible y no permite que los menores tengan cuenta.",
        "El club es quien debe contar con la base legal para tratar los datos deportivos de sus jugadores, normalmente la ficha o inscripción en el club y, cuando sea necesario, el consentimiento de madres, padres o tutores, e informarles de este tratamiento."
      ] },
      { titulo: "4. Para qué y con qué base legal", parrafos: [
        "Cuentas: para darte acceso y prestarte el servicio (ejecución del contrato que aceptas al registrarte) y para escribirte sobre tu cuenta, por ejemplo para recuperar la contraseña.",
        "Datos de jugadores y del equipo: para la organización deportiva del club (base legal del club, ver punto 3). No se usan para publicidad, ni se venden, ni se usan para elaborar perfiles."
      ] },
      { titulo: "5. Dónde se guardan y quién los ve", parrafos: [
        "Los datos se guardan en Supabase, en servidores de la Unión Europea (Irlanda). La app se publica en Netlify.",
        "Dentro de la app, cada entrenador solo ve los equipos que le asigna su club y la directiva solo ve los equipos y entrenadores de su club. Esto lo controla el propio servidor, no solo la app.",
        "Supabase y Netlify actúan como proveedores (subencargados) con contratos que les obligan a proteger los datos. Si algún proveedor accede desde fuera del Espacio Económico Europeo, se hace con las garantías del RGPD (decisión de adecuación o cláusulas contractuales tipo). No se ceden datos a nadie más, salvo obligación legal."
      ] },
      { titulo: "6. Cuánto tiempo", parrafos: [
        "Los datos de tu cuenta se conservan mientras la tengas activa. Si pides la baja, se borran, salvo lo que la ley obligue a guardar durante un tiempo.",
        "Los datos de los jugadores los decide el club: se borran cuando el entrenador o la directiva borran al jugador, el equipo o el club."
      ] },
      { titulo: "7. Tus derechos", parrafos: [
        `Puedes pedir acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de tus datos escribiendo a ${t.correo}. Te responderemos en el plazo de un mes.`,
        "Si eres madre, padre o tutor de un jugador, dirígete primero al club, que es el responsable de esos datos. Nosotros le ayudaremos a atender tu petición.",
        "Si crees que no se han respetado tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es)."
      ] },
      { titulo: "8. Almacenamiento en tu dispositivo", parrafos: [
        "Míster no usa cookies de publicidad ni de seguimiento. Solo guarda en tu navegador lo imprescindible para funcionar: tu sesión iniciada, el tema claro u oscuro, el equipo con el que trabajas y los archivos de la propia app para que abra más rápido. Al ser técnicamente necesario, no requiere consentimiento."
      ] }
    ]
  },
  {
    id: "propiedad",
    titulo: "Propiedad intelectual",
    resumen: "De quién es la app, de quién es tu contenido y qué piezas de terceros usa.",
    secciones: [
      { titulo: "1. La app", parrafos: [
        `El nombre Míster, el logotipo, el diseño, los textos, los iconos y el código de la aplicación son propiedad de ${t.nombre} o se usan con licencia, y están protegidos por la Ley de Propiedad Intelectual y la normativa de marcas.`,
        "Te damos permiso para usar la app para la gestión de tu club mientras tengas cuenta. No está permitido copiarla, venderla, modificarla, descompilarla ni crear productos derivados sin autorización por escrito."
      ] },
      { titulo: "2. Tu contenido", parrafos: [
        "Los ejercicios, dibujos de la pizarra, sesiones, alineaciones, notas y datos que creas en Míster son tuyos o de tu club. Solo nos das permiso para guardarlos y mostrarlos dentro de la app para prestarte el servicio, y ese permiso termina cuando los borras o das de baja la cuenta.",
        "Si introduces material de otras personas (por ejemplo, ejercicios sacados de un libro), eres responsable de tener derecho a usarlo."
      ] },
      { titulo: "3. Ejercicios de ejemplo", parrafos: [
        "Los ejercicios de ejemplo que trae la app son de libre uso dentro de Míster: puedes usarlos, cambiarlos, duplicarlos, imprimirlos y compartirlos con tu equipo."
      ] },
      { titulo: "4. Piezas de terceros", parrafos: [
        "Míster usa programas de código abierto con licencias que permiten este uso, entre ellos React, React Router, Supabase JS, jsPDF, Vite y Workbox (licencias MIT y similares).",
        "Las tipografías Big Shoulders Display y Barlow se usan bajo la licencia SIL Open Font License 1.1.",
        "Los nombres de clubes, competiciones y equipos rivales que escriban los usuarios pertenecen a sus titulares y se usan solo para identificarlos."
      ] },
      { titulo: "5. Avisos", parrafos: [
        `Si crees que algún contenido de la app vulnera tus derechos, escríbenos a ${t.correo} y lo revisaremos.`
      ] }
    ]
  },
  {
    id: "datos",
    titulo: "Cumplimiento en protección de datos",
    resumen: "Cómo cumple Míster el RGPD y la LOPDGDD y qué le toca a cada club.",
    secciones: [
      { titulo: "1. Normas que se cumplen", parrafos: [
        "Reglamento General de Protección de Datos (RGPD, UE 2016/679), Ley Orgánica 3/2018 de Protección de Datos y garantía de los derechos digitales (LOPDGDD) y Ley 34/2002 de servicios de la sociedad de la información (LSSI)."
      ] },
      { titulo: "2. Privacidad desde el diseño", parrafos: [
        "Minimización: de los jugadores solo se guarda lo imprescindible para entrenar (nombre o mote, pierna, posición, dorsal y la actividad deportiva). La app no tiene campos para fecha de nacimiento, fotos, DNI, teléfono, dirección ni salud.",
        "Sin cuentas para menores: solo tienen cuenta la directiva y los entrenadores.",
        "Sin publicidad, sin rastreo y sin venta de datos."
      ] },
      { titulo: "3. Seguridad", parrafos: [
        "Datos alojados en la Unión Europea (Supabase, Irlanda).",
        "Conexión siempre cifrada (HTTPS) y contraseñas guardadas cifradas.",
        "Control de acceso en el servidor mediante seguridad por filas: cada entrenador solo puede leer y escribir los datos de sus equipos, y cada directiva solo los de su club. Los entrenadores necesitan confirmar su correo antes de poder ver los datos de su equipo."
      ] },
      { titulo: "4. Reparto de responsabilidades", parrafos: [
        "El club (cuenta de directiva) es responsable de los datos de sus jugadores: debe tener la base legal para tratarlos, informar a las familias, asignar el acceso solo a sus entrenadores y quitarlo cuando dejen el club.",
        "El titular de Míster es encargado del tratamiento de esos datos: solo los trata para prestar el servicio, no los usa para nada más, guarda confidencialidad, aplica las medidas de seguridad descritas, ayuda al club a atender los derechos de las familias y le avisa sin demora si ocurre una brecha de seguridad.",
        "Los entrenadores deben usar la app solo para su labor deportiva y no anotar datos sensibles en las notas."
      ] },
      { titulo: "5. Brechas de seguridad", parrafos: [
        "Si se detecta un acceso no autorizado a los datos, se avisará al club afectado sin demora para que, si procede, lo comunique a la Agencia Española de Protección de Datos en un máximo de 72 horas y a las personas afectadas."
      ] },
      { titulo: "6. Borrado de datos", parrafos: [
        "Borrar un jugador, un equipo o un club elimina sus datos asociados. La app pide confirmación antes de cualquier borrado.",
        `Para borrar una cuenta completa o pedir una copia de los datos, escribe a ${t.correo}.`
      ] },
      { titulo: "7. Recomendaciones para el club", parrafos: [
        "Incluir en la hoja de inscripción del club un aviso de que los datos deportivos se gestionan con Míster.",
        "Mantener actualizada la lista de entrenadores con acceso en el panel de directiva.",
        "No compartir la hoja de alineación ni el PDF de sesión fuera del ámbito del equipo."
      ] }
    ]
  }
];

/** Indica si aún faltan los datos del titular por rellenar. */
export const faltanDatosTitular = () => Object.values(TITULAR).some((v) => v.startsWith("["));
