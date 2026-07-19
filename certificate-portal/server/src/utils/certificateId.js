/** Generates a certificate ID in the form CERT-YYYY-XXXXXX. */
function generateCertificateId() {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CERT-${year}-${suffix}`;
}

module.exports = { generateCertificateId };
