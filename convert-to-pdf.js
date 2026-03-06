const fs = require('fs');
const path = require('path');

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { marked } = require('marked');

async function markdownToPDF(markdownContent, outputPath) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 50;
  const lineHeight = fontSize * 1.5;
  let yPosition = height - margin;

  const htmlContent = marked(markdownContent);
  
  const textContent = htmlContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));

  const lines = textContent.split('\n');
  
  for (const line of lines) {
    if (yPosition < margin + lineHeight) {
      page = pdfDoc.addPage();
      yPosition = height - margin;
    }

    const text = line.trim();
    if (text) {
      try {
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        
        if (textWidth > width - 2 * margin) {
          const words = text.split(' ');
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            
            if (testWidth > width - 2 * margin) {
              page.drawText(currentLine, {
                x: margin,
                y: yPosition,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
              });
              currentLine = word;
              yPosition -= lineHeight;
              
              if (yPosition < margin + lineHeight) {
                page = pdfDoc.addPage();
                yPosition = height - margin;
              }
            } else {
              currentLine = testLine;
            }
          }
          
          if (currentLine) {
            page.drawText(currentLine, {
              x: margin,
              y: yPosition,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            });
            yPosition -= lineHeight;
          }
        } else {
          page.drawText(text, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
          yPosition -= lineHeight;
        }
      } catch (error) {
        console.warn('Warning: Could not render text:', text);
        console.warn('Error:', error.message);
        yPosition -= lineHeight;
      }
    } else {
      yPosition -= lineHeight / 2;
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

async function convertFile(inputPath, outputPath) {
  const markdownContent = fs.readFileSync(inputPath, 'utf-8');
  await markdownToPDF(markdownContent, outputPath);
  console.log(`Converted ${inputPath} to ${outputPath}`);
}

async function main() {
  const requirementsPath = path.join(__dirname, 'forum', 'requirements.md');
  const requirementsPDFPath = path.join(__dirname, 'forum', 'requirements.pdf');
  
  const specsPath = path.join(__dirname, 'forum', 'technical-specs.md');
  const specsPDFPath = path.join(__dirname, 'forum', 'technical-specs.pdf');

  try {
    await convertFile(requirementsPath, requirementsPDFPath);
    await convertFile(specsPath, specsPDFPath);
    console.log('All files converted successfully!');
  } catch (error) {
    console.error('Error converting files:', error);
    process.exit(1);
  }
}

main();
