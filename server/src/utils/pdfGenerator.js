const PDFDocument = require('pdfkit');
const path = require('path');

// --- Palette (the original aurora-glass dark theme) ---
const BG_TOP = '#0b1220';
const BG_BOTTOM = '#060a14';
const TEAL = '#2dd4bf';
const VIOLET = '#8b7cf6';
const GOLD = '#c9a24b';
const GOLD_SOFT = '#e8c877';
const INK_100 = '#eef1fb';
const INK_300 = '#c3c9e0';
const INK_400 = '#9aa3c4';

const FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'images', 'wu-crest-gold.png');

function drawAuroraBackground(doc) {
  const { width, height } = doc.page;

  const bgGrad = doc.linearGradient(0, 0, 0, height);
  bgGrad.stop(0, BG_TOP).stop(1, BG_BOTTOM);
  doc.rect(0, 0, width, height).fill(bgGrad);

  drawBloom(doc, width * 0.04, height * 0.0, 300, TEAL, 0.3);
  drawBloom(doc, width * 0.98, height * 1.0, 320, GOLD, 0.28);
  drawBloom(doc, width * 0.5, height * -0.15, 260, VIOLET, 0.14);
}

function drawBloom(doc, cx, cy, radius, color, peakOpacity = 0.32) {
  const grad = doc.radialGradient(cx, cy, 0, cx, cy, radius);
  grad.stop(0, color, peakOpacity).stop(0.6, color, peakOpacity * 0.45).stop(1, color, 0);
  doc.save();
  doc.rect(cx - radius, cy - radius, radius * 2, radius * 2).fill(grad);
  doc.restore();
}

function drawGradientRule(doc, x1, y, x2) {
  const grad = doc.linearGradient(x1, y, x2, y);
  grad.stop(0, TEAL).stop(0.5, VIOLET).stop(1, GOLD);
  doc.save();
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(1.4).strokeOpacity(0.9).stroke(grad);
  doc.restore();
}

function drawGlassPanel(doc, x, y, w, h, radius = 14) {
  doc.save();
  doc.roundedRect(x + 3, y + 5, w, h, radius).fillOpacity(0.28).fill('#000000');
  doc.restore();

  doc.save();
  doc.roundedRect(x, y, w, h, radius).fillOpacity(0.06).fill('#ffffff');
  doc.restore();

  doc.save();
  doc.roundedRect(x, y, w, h, radius).lineWidth(1).strokeOpacity(0.14).stroke('#ffffff');
  doc.restore();
}

function drawPillChip(doc, x, y, w, h, label, value) {
  doc.save();
  doc.roundedRect(x, y, w, h, h / 2).fillOpacity(0.06).fill('#ffffff');
  doc.roundedRect(x, y, w, h, h / 2).lineWidth(0.75).strokeOpacity(0.16).stroke('#ffffff');
  doc.restore();

  doc.save();
  doc.font('GoogleSans-450').fontSize(7).fillColor(INK_400).fillOpacity(1);
  doc.text(label, x, y + h / 2 - 12, { width: w, align: 'center' });
  doc.font('GoogleSans-600').fontSize(9.5).fillColor(INK_100);
  doc.text(value, x, y + h / 2 + 1, { width: w, align: 'center' });
  doc.restore();
}

function formatDate(value) {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Draws the certificate artwork onto an already-open PDFKit document.
 * Aurora-glass dark theme: soft radial-gradient blooms, frosted glass
 * panels, the real university crest, Montserrat/Google Sans typography,
 * and a hand-signed "Sri" signature in a custom script font.
 */
function drawCertificate(doc, data) {
  const { width, height } = doc.page;
  const centerX = width / 2;

  drawAuroraBackground(doc);

  // Outer hairline frame
  doc.save();
  doc.roundedRect(20, 20, width - 40, height - 40, 8).lineWidth(1).strokeOpacity(0.14).stroke('#ffffff');
  doc.restore();

  // Logo crest — the real artwork, not a procedural medallion. `fit`
  // scales proportionally within the box (the source PNG is square-padded
  // for the web app's CSS icon containers, so `fit` avoids distortion).
  const logoBox = 84;
  doc.image(LOGO_PATH, centerX - logoBox / 2, 38, {
    fit: [logoBox, logoBox],
    align: 'center',
    valign: 'center',
  });

  // Organization name
  doc.save();
  doc.font('GoogleSans-600').fontSize(12).fillColor(GOLD_SOFT).fillOpacity(1);
  doc.text('WATERLOO UNIVERSITY', 0, 130, { width, align: 'center', characterSpacing: 2 });
  doc.restore();

  // Title
  doc.save();
  doc.font('Montserrat-600').fontSize(30).fillColor(INK_100).fillOpacity(1);
  doc.text('Certificate of Achievement', 0, 152, { width, align: 'center' });
  doc.restore();

  drawGradientRule(doc, centerX - 100, 196, centerX + 100);

  // Glass panel behind the recipient name
  const panelW = 400;
  const panelX = centerX - panelW / 2;
  const panelY = 220;
  const panelH = 96;
  drawGlassPanel(doc, panelX, panelY, panelW, panelH);

  doc.save();
  doc.font('GoogleSans-450').fontSize(12).fillColor(INK_300).fillOpacity(1);
  doc.text('This is to certify that', 0, panelY + 16, { width, align: 'center' });
  doc.restore();

  doc.save();
  doc.font('Montserrat-600').fontSize(25).fillColor(INK_100).fillOpacity(1);
  doc.text(data.recipientName || 'Recipient Name', 0, panelY + 36, { width, align: 'center' });
  doc.restore();

  doc.save();
  doc.font('GoogleSans-450').fontSize(10).fillColor(INK_400).fillOpacity(1);
  doc.text(`Register Number: ${data.registerNumber || '-'}`, 0, panelY + 72, { width, align: 'center' });
  doc.restore();

  // Course line
  doc.save();
  doc.font('GoogleSans-450').fontSize(11.5).fillColor(INK_300).fillOpacity(1);
  doc.text('has successfully completed the course', 0, panelY + panelH + 18, { width, align: 'center' });
  doc.font('Montserrat-600').fontSize(16).fillColor(GOLD_SOFT);
  doc.text(data.course || 'Course Title', 0, panelY + panelH + 36, { width, align: 'center' });
  doc.restore();

  // Footer — three even columns: issue date | certificate id | signature
  const footerY = height - 100;
  const colWidth = width / 3;
  const chipW = 172;
  const chipH = 44;

  drawPillChip(doc, colWidth * 0 + (colWidth - chipW) / 2, footerY, chipW, chipH, 'ISSUE DATE', formatDate(data.issueDate));
  drawPillChip(
    doc,
    colWidth * 1 + (colWidth - chipW) / 2,
    footerY,
    chipW,
    chipH,
    'CERTIFICATE ID',
    data.certificateId || '-'
  );

  const sigColX = colWidth * 2;
  doc.save();
  doc.font('SignatureFont').fontSize(26).fillColor(INK_100).fillOpacity(1);
  doc.text('Sri', sigColX, footerY - 6, { width: colWidth, align: 'center' });
  doc
    .moveTo(sigColX + colWidth / 2 - 70, footerY + 24)
    .lineTo(sigColX + colWidth / 2 + 70, footerY + 24)
    .strokeOpacity(0.25)
    .lineWidth(0.75)
    .stroke('#ffffff');
  doc.font('GoogleSans-450').fontSize(8.5).fillColor(INK_400);
  doc.text('Authorized Signature', sigColX, footerY + 30, { width: colWidth, align: 'center' });
  doc.restore();
}

/**
 * Renders a single certificate and resolves with a Buffer containing the PDF.
 * `data` shape: { recipientName, registerNumber, course, certificateId, issueDate }
 */
function renderCertificateBuffer(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    doc.registerFont('Montserrat-600', path.join(FONTS_DIR, 'Montserrat-600.ttf'));
    doc.registerFont('GoogleSans-450', path.join(FONTS_DIR, 'GoogleSans-450.ttf'));
    doc.registerFont('GoogleSans-600', path.join(FONTS_DIR, 'GoogleSans-600.ttf'));
    doc.registerFont('SignatureFont', path.join(FONTS_DIR, 'BillyArgel.ttf'));

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawCertificate(doc, data);
    doc.end();
  });
}

module.exports = { drawCertificate, renderCertificateBuffer };
