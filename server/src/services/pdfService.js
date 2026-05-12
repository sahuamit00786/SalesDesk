import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generatePdf(
  filePath,
  title,
  content
) {

  return new Promise((resolve) => {

    // ✅ ensure directory exists
    fs.mkdirSync(
      path.dirname(filePath),
      {
        recursive: true,
      }
    );

    const doc = new PDFDocument();

    const stream =
      fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc
      .fontSize(20)
      .text(title);

    doc.moveDown();

    doc
      .fontSize(12)
      .text(content);

    doc.end();

    stream.on("finish", () => {
      resolve(filePath);
    });

  });

}