import amex1 from '../assets/amex1.png'
import amex2 from '../assets/amex2.png'
import amex3 from '../assets/amex3.png'
import amex4 from '../assets/amex4.png'
import apple1 from '../assets/apple1.png'
import apple2 from '../assets/apple2.png'

export const HELP_CONTENT = {
  amex: {
    title: 'How to find your American Express PDF',
    steps: [
      {
        text: 'Log in to your American Express account and click on <strong>Statements & Activity</strong>',
        image: amex1,
        altText: 'American Express navigation showing Statements & Activity tab'
      },
      {
        text: 'Click the <strong>Go to PDF Statements</strong> button',
        image: amex2,
        altText: 'Go to PDF Statements button'
      },
      {
        text: 'Find the statement you want to download and click the <strong>Download</strong> button',
        image: amex3,
        altText: 'Recent Statements list with Download buttons'
      },
      {
        text: 'Select <strong>Billing Statement (PDF)</strong> and click <strong>Download</strong>',
        image: amex4,
        altText: 'File type selection dialog with Billing Statement PDF selected'
      },
      {
        text: 'Once downloaded, use the upload button above to select and upload your PDF statement',
        image: null,
        altText: null
      }
    ]
  },
  apple: {
    title: 'How to find your Apple Card statement',
    steps: [
      {
        text: 'Go to <strong>card.apple.com</strong> on your laptop and click on <strong>Statements</strong>',
        image: apple1,
        altText: 'Apple Card website showing Statements option'
      },
      {
        text: 'Find the statement you want and click the <strong>download icon</strong> on the right',
        image: apple2,
        altText: 'Statements list with download icons'
      },
      {
        text: 'Save the PDF to your device, then use the upload button above to select and upload it',
        image: null,
        altText: null
      }
    ]
  }
}

export const UPLOAD_LABELS = {
  uploadButton: {
    default: 'Upload Files (CSV/PDF)',
    processing: 'Processing...'
  },
  clearButton: 'Clear All Data',
  amexNote: 'CSV/PDF support: American Express Credit Card',
  appleNote: 'CSV/PDF support: Apple Credit Card',
  usbankNote: 'CSV/PDF support: US Bank Credit Card',
  amexAriaLabel: 'How to find and download your American Express Credit Card statement',
  appleAriaLabel: 'How to find and download your Apple Credit Card statement',
  usbankAriaLabel: 'How to find and download your US Bank Credit Card statement'
}
