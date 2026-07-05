// Contoh sederhana - bisa dikembangkan dengan nodemailer
const sendEmail = async (to, subject, body) => {
  // Implementasi email service
  // Bisa menggunakan nodemailer, SendGrid, atau service lain
  console.log(`📧 Email akan dikirim ke ${to}`);
  console.log(`Subjek: ${subject}`);
  console.log(`Body: ${body}`);

  // TODO: Implement actual email sending
  return true;
};

const sendWelcomeEmail = async (user) => {
  const subject = "Selamat Datang di Barmodule!";
  const body = `
    Halo ${user.name},
    
    Selamat datang di Barmodule E-Learning Platform!
    Kami senang Anda bergabung dengan kami.
    
    Mulai belajar sekarang dan tingkatkan skill tata rias Anda!
    
    Salam,
    Tim Barmodule
  `;

  return await sendEmail(user.email, subject, body);
};

module.exports = { sendEmail, sendWelcomeEmail };
