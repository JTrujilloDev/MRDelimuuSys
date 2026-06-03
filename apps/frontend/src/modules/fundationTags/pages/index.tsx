import qz from "qz-tray";

const Index = () => {
  const html = `
  <html>
    <head>
      <style>
        @page {
        size: 50mm 33mm;
        margin: 0;
        }

        body {
            width: 50mm;
            height: 33mm;
            margin: 0;
            padding: 0;
        }

        .label {
            height: 30mm;
            overflow: hidden;
            font-size: 8pt;
        }

        .title {
          text-align: center;
          font-weight: bold;
          font-size: 10pt;
          margin-bottom: 2px;
          font-family: Arial, sans-serif;
        }

        .product {
          font-weight: bold;
          font-size: 9pt;
          margin-bottom: 2px;
        }

        .row {
          margin-bottom: 1px;
        }

        .footer {
          margin-top: 2px;
          text-align: center;
          font-size: 7pt;
        }
      </style>
    </head>
    <body>
    <div class="label">
      <div class="title">DELIMUU</div>

      <div class="product">Pan blando</div>

      <div class="row">
        <strong>Ing:</strong> Harina, agua, levadura, sal, azúcar
      </div>

      <div class="row">
        <strong>Cont. Neto:</strong> 50 panes de 50g
      </div>

      <div class="row">
        <strong>Vence:</strong>  03/12/2024
      </div>

      <div class="row">
        <strong>Lote:</strong> PB-20241203-001
      </div>

      <div class="footer">
        Consérvese en un lugar fresco y seco
      </div>
    </div>
    </body>
  </html>
  `;

  const config = qz.configs.create("XP-58");
  const data = [
    {
      type: "pixel",
      format: "html",
      flavor: "plain", // or 'plain' if the data is raw HTML
      data: html,
    },
  ];

  const print = () => {
    qz.print(config, data).catch(function (e) {
      console.error(e);
    });
  };

  return (
    <div>
      <button type="button" onClick={print}>
        Generar
      </button>
    </div>
  );
};

export default Index;
