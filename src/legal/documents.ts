// Aviso de privacidad y Términos y condiciones de Plania.
// BORRADOR: revisarlo con un abogado antes de publicar la app. Los datos marcados con
// [PENDIENTE] los tiene que completar RemakeNet (ver LEGAL_PENDING abajo).

export type LegalDoc = 'privacy' | 'terms';
type Section = { heading: string; body: string[] };
type Doc = { title: string; updated: string; intro: string; sections: Section[] };

/** Datos que faltan. Mientras existan, se muestran tal cual dentro del texto. */
export const LEGAL_PENDING = {
  legalName: '[PENDIENTE: razón social, p. ej. RemakeNet S.A.S.]',
  address: '[PENDIENTE: domicilio fiscal completo]',
  email: '[PENDIENTE: correo de privacidad, p. ej. privacidad@remakenet.com]',
  updated: '[PENDIENTE: fecha de publicación]',
};

const P = LEGAL_PENDING;

const es: Record<LegalDoc, Doc> = {
  privacy: {
    title: 'Aviso de privacidad',
    updated: `Última actualización: ${P.updated}`,
    intro: `${P.legalName} ("RemakeNet"), con domicilio en ${P.address}, es responsable del tratamiento de tus datos personales en la aplicación Plania, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.`,
    sections: [
      {
        heading: 'Qué datos recabamos',
        body: [
          'Datos de tu cuenta de Google: nombre, correo electrónico y foto de perfil.',
          'Lo que tú nos das al usar Plania: tu nivel de estudios, tus materias, los documentos que subes (PDF, Word o PowerPoint), tus notas, ideas, proyectos y eventos, el lugar de tus eventos y el material de estudio que se genera.',
          'Datos de uso: tus resultados en exámenes y tarjetas, tu racha de estudio y cuántas generaciones con IA usas al mes.',
          'Si das permiso, tu ubicación aproximada, solo en el momento en que buscas el lugar de un evento. No la guardamos de forma continua.',
          'No recabamos datos personales sensibles. Te pedimos no subir documentos con datos sensibles tuyos o de otras personas.',
        ],
      },
      {
        heading: 'Para qué los usamos',
        body: [
          'Finalidades necesarias: crear y mantener tu cuenta; guardar tus materias, documentos y organizador; generar resúmenes, tarjetas y exámenes a partir de tus documentos; enviarte los recordatorios que programes; permitirte compartir exámenes con un código; aplicar los límites de tu plan y, cuando exista, gestionar tu suscripción Pro.',
          'Finalidades secundarias: avisarte por correo de funciones nuevas si te inscribiste en una lista de espera y enviarte el cupón correspondiente. Puedes negarte a estas finalidades en cualquier momento escribiendo a la dirección de contacto, sin que eso afecte el uso de Plania.',
        ],
      },
      {
        heading: 'Con quién compartimos tus datos',
        body: [
          'Para funcionar, Plania usa proveedores que tratan tus datos por cuenta de RemakeNet: Supabase (base de datos, cuentas y almacenamiento de archivos), Google (inicio de sesión) y un proveedor de inteligencia artificial que lee tus documentos para generar el material de estudio (Google Gemini o Anthropic Claude). Algunos de estos servidores están fuera de México.',
          'Cuando compartes un examen o tarjetas con un código, quien lo use verá ese material y tu primer nombre.',
          'No vendemos tus datos ni los usamos para publicidad.',
        ],
      },
      {
        heading: 'Menores de edad',
        body: [
          'Plania está pensada para estudiantes de 15 años en adelante. Si tienes menos de 18 años, necesitas el consentimiento de tu madre, padre o tutor para usar la app. Si eres madre, padre o tutor y quieres que borremos los datos de un menor, escríbenos.',
        ],
      },
      {
        heading: 'Tus derechos (ARCO) y cómo ejercerlos',
        body: [
          `Puedes acceder a tus datos, corregirlos, cancelarlos u oponerte a su uso, y revocar tu consentimiento, escribiendo a ${P.email} con tu nombre, el correo de tu cuenta y lo que solicitas. Te responderemos en un máximo de 20 días hábiles.`,
          'También puedes borrar tu cuenta y todo tu contenido en cualquier momento desde la app: Perfil → Borrar mi cuenta.',
        ],
      },
      {
        heading: 'Cuánto tiempo guardamos tus datos',
        body: [
          'Mientras tengas una cuenta. Al borrarla, eliminamos tu perfil, materias, documentos, material de estudio y organizador. Los archivos que se envían al proveedor de IA se borran al terminar de procesarlos.',
        ],
      },
      {
        heading: 'Seguridad',
        body: [
          'Cada usuario solo puede ver su propia información, las conexiones van cifradas y las llaves de los servicios viven solo en el servidor. Ningún sistema es infalible; si detectamos un incidente que afecte tus datos, te avisaremos.',
        ],
      },
      {
        heading: 'Cambios a este aviso',
        body: ['Si cambiamos este aviso, lo publicaremos en la app con su nueva fecha y, si el cambio es importante, te lo avisaremos.'],
      },
    ],
  },
  terms: {
    title: 'Términos y condiciones',
    updated: `Última actualización: ${P.updated}`,
    intro: `Estos términos regulan el uso de Plania, una aplicación de ${P.legalName} ("RemakeNet"). Al crear una cuenta los aceptas.`,
    sections: [
      {
        heading: 'Tu cuenta',
        body: [
          'Inicias sesión con Google. Eres responsable de lo que se haga con tu cuenta. Si tienes menos de 18 años, necesitas el permiso de tu madre, padre o tutor.',
        ],
      },
      {
        heading: 'Tu contenido',
        body: [
          'Los documentos, notas y demás contenido que subes siguen siendo tuyos. Nos das permiso de guardarlos y procesarlos solo para darte el servicio (por ejemplo, para generar tu material de estudio).',
          'Solo sube contenido que tengas derecho a usar. No subas material que viole derechos de autor de terceros, datos personales de otras personas sin su permiso, ni contenido ilegal.',
        ],
      },
      {
        heading: 'Material generado con inteligencia artificial',
        body: [
          'Los resúmenes, tarjetas y exámenes se generan automáticamente y pueden contener errores. Úsalos como apoyo para estudiar, compáralos con tu material y con lo que indique tu profesor. RemakeNet no garantiza calificaciones ni resultados académicos.',
        ],
      },
      {
        heading: 'Planes y pagos',
        body: [
          'El plan gratis tiene límites de uso que se muestran en la app. Plania Pro será una suscripción mensual o anual que se cobra a través de Google Play o el App Store; su renovación y cancelación se gestionan desde la tienda. Los cupones tienen las condiciones que se indiquen al entregarlos.',
          'Las funciones marcadas como "Próximamente" todavía no están disponibles y pueden cambiar.',
        ],
      },
      {
        heading: 'Uso aceptable',
        body: [
          'No uses Plania para dañar a otras personas, intentar acceder a cuentas ajenas, sobrecargar el servicio o copiar la aplicación. Podemos suspender cuentas que incumplan estos términos.',
        ],
      },
      {
        heading: 'Disponibilidad y responsabilidad',
        body: [
          'Hacemos lo posible para que Plania funcione siempre, pero puede haber interrupciones. En la medida que lo permita la ley, RemakeNet no es responsable de pérdidas indirectas por el uso de la app. Te recomendamos conservar tus propios archivos.',
        ],
      },
      {
        heading: 'Cambios, terminación y ley aplicable',
        body: [
          'Podemos actualizar estos términos y te avisaremos si el cambio es importante. Puedes dejar de usar Plania y borrar tu cuenta cuando quieras.',
          `Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Contacto: ${P.email}.`,
        ],
      },
    ],
  },
};

const en: Record<LegalDoc, Doc> = {
  privacy: {
    title: 'Privacy notice',
    updated: `Last updated: ${P.updated}`,
    intro: `${P.legalName} ("RemakeNet"), located at ${P.address}, is responsible for your personal data in the Plania app, under Mexico's Federal Law on the Protection of Personal Data Held by Private Parties.`,
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Your Google account data: name, email and profile photo.',
          'What you give us while using Plania: your level of studies, subjects, uploaded documents (PDF, Word or PowerPoint), your notes, ideas, projects and events, event locations, and the study material generated.',
          'Usage data: your exam and flashcard results, study streak and how many AI generations you use per month.',
          'If you allow it, your approximate location, only when you search for an event place. We don’t track it continuously.',
          'We don’t collect sensitive personal data. Please don’t upload documents with sensitive data about you or others.',
        ],
      },
      {
        heading: 'How we use it',
        body: [
          'Required purposes: creating and keeping your account; storing your subjects, documents and organizer; generating summaries, flashcards and exams from your documents; sending the reminders you set; letting you share exams with a code; applying your plan limits and, when available, managing your Pro subscription.',
          'Secondary purposes: emailing you about new features if you joined a waitlist and sending the related coupon. You can opt out at any time by writing to the contact address, and you can keep using Plania.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'To work, Plania uses providers that process data on RemakeNet’s behalf: Supabase (database, accounts and file storage), Google (sign-in) and an AI provider that reads your documents to generate study material (Google Gemini or Anthropic Claude). Some of these servers are outside Mexico.',
          'When you share an exam or flashcards with a code, whoever uses it sees that material and your first name.',
          'We don’t sell your data or use it for advertising.',
        ],
      },
      {
        heading: 'Minors',
        body: [
          'Plania is designed for students aged 15 and older. If you are under 18, you need a parent or guardian’s consent to use the app. Parents or guardians can ask us to delete a minor’s data.',
        ],
      },
      {
        heading: 'Your rights and how to use them',
        body: [
          `You can access, correct or delete your data, object to its use, and withdraw consent by emailing ${P.email} with your name, account email and request. We reply within 20 business days.`,
          'You can also delete your account and all your content at any time in the app: Profile → Delete my account.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'While you have an account. When you delete it, we remove your profile, subjects, documents, study material and organizer. Files sent to the AI provider are deleted once processed.',
        ],
      },
      {
        heading: 'Security',
        body: [
          'Each user can only see their own information, connections are encrypted and service keys live only on the server. No system is perfect; if an incident affects your data, we’ll let you know.',
        ],
      },
      {
        heading: 'Changes',
        body: ['If we change this notice, we’ll publish it in the app with its new date and tell you if the change is significant.'],
      },
    ],
  },
  terms: {
    title: 'Terms and conditions',
    updated: `Last updated: ${P.updated}`,
    intro: `These terms govern your use of Plania, an app by ${P.legalName} ("RemakeNet"). By creating an account you accept them.`,
    sections: [
      { heading: 'Your account', body: ['You sign in with Google and are responsible for activity on your account. If you are under 18, you need a parent or guardian’s permission.'] },
      {
        heading: 'Your content',
        body: [
          'Documents, notes and other content you upload remain yours. You let us store and process them only to provide the service (for example, to generate your study material).',
          'Only upload content you have the right to use. Don’t upload material that infringes copyright, other people’s personal data without permission, or illegal content.',
        ],
      },
      {
        heading: 'AI-generated material',
        body: [
          'Summaries, flashcards and exams are generated automatically and may contain mistakes. Use them as a study aid and check them against your material and your teacher’s guidance. RemakeNet doesn’t guarantee grades or academic results.',
        ],
      },
      {
        heading: 'Plans and payments',
        body: [
          'The free plan has usage limits shown in the app. Plania Pro will be a monthly or yearly subscription billed through Google Play or the App Store; renewal and cancellation are managed in the store. Coupons have the conditions stated when issued.',
          'Features marked "Coming soon" aren’t available yet and may change.',
        ],
      },
      { heading: 'Acceptable use', body: ['Don’t use Plania to harm others, access other accounts, overload the service or copy the app. We may suspend accounts that break these terms.'] },
      {
        heading: 'Availability and liability',
        body: ['We work to keep Plania running, but there may be interruptions. To the extent permitted by law, RemakeNet isn’t liable for indirect losses from using the app. Keep your own copies of your files.'],
      },
      {
        heading: 'Changes, termination and governing law',
        body: [
          'We may update these terms and will tell you about significant changes. You can stop using Plania and delete your account at any time.',
          `These terms are governed by the laws of Mexico. Contact: ${P.email}.`,
        ],
      },
    ],
  },
};

export function legalDocument(doc: LegalDoc, locale: 'es' | 'en'): Doc {
  return (locale === 'en' ? en : es)[doc];
}
