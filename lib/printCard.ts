// 🖨️ طباعة كارت العميل
export function printCustomerCard() {
  const qrUrl = `https://wa.me/201038084846?text=${encodeURIComponent('أهلاً، عايز أستفسر عن صيانة 📱')}`;

  const cardHTML = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>كارت BOODY Group</title>
      <style>
        @page { size: 58mm 40mm; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 58mm; height: 40mm;
          font-family: 'Cairo', Tahoma, sans-serif;
          background: #000; color: #fff;
          padding: 2mm;
          display: flex; flex-direction: column;
          justify-content: space-between;
        }
        .header {
          display: flex; align-items: center; gap: 1.5mm;
          border-bottom: 0.3mm solid #00d4ff;
          padding-bottom: 1mm;
        }
        .logo {
          width: 8mm; height: 8mm;
          background: linear-gradient(135deg, #00d4ff, #0066ff);
          border-radius: 1.5mm;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 3mm; color: #fff;
          flex-shrink: 0;
        }
        .shop-info h1 { font-size: 2.8mm; font-weight: 900; color: #00d4ff; line-height: 1; }
        .shop-info p { font-size: 1.8mm; color: #aaa; margin-top: 0.3mm; }
        .phone { font-size: 2.8mm; font-weight: 900; color: #00d4ff; text-align: center; }
        .names { font-size: 1.8mm; color: #fff; text-align: center; }
        .footer {
          display: flex; align-items: center; gap: 1mm;
          border-top: 0.3mm solid #00d4ff;
          padding-top: 1mm;
        }
        .qr-box {
          width: 10mm; height: 10mm;
          background: #fff; padding: 0.5mm; border-radius: 1mm;
          flex-shrink: 0;
        }
        .qr-box svg { width: 100%; height: 100%; }
        .slogan-ar { font-size: 1.8mm; font-weight: 700; color: #00d4ff; }
        .slogan-en { font-size: 1.4mm; color: #aaa; direction: ltr; text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">MS</div>
        <div class="shop-info">
          <h1>BOODY Group</h1>
          <p>MS Fix — Board Level Repair</p>
        </div>
      </div>
      <div>
        <div class="phone">📞 01038084846</div>
        <div class="names">👨‍🔧 محمد سعد | 👨‍💼 أحمد سعد</div>
      </div>
      <div class="footer">
        <div class="qr-box" id="qr-placeholder"></div>
        <div>
          <div class="slogan-ar">دقة. خبرة. ثقة</div>
          <div class="slogan-en">Precision. Experience. Trust.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=300,height=400');
  if (!printWindow) {
    alert('⚠️ الرجاء السماح بالنوافذ المنبثقة');
    return;
  }

  printWindow.document.write(cardHTML);
  printWindow.document.close();

  const qrScript = printWindow.document.createElement('script');
  qrScript.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
  qrScript.onload = () => {
    const qr = (printWindow as any).qrcode(0, 'M');
    qr.addData(qrUrl);
    qr.make();
    const placeholder = printWindow.document.getElementById('qr-placeholder');
    if (placeholder) {
      placeholder.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
    }
    setTimeout(() => printWindow.print(), 500);
  };
  printWindow.document.head.appendChild(qrScript);
}