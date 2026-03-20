# tap-test
How it works now:
Setup (seller does once):

Go to your GitHub Pages URL → enter Venmo username + configure each tag's price & message
The app generates a unique URL per tag, like:

   https://user.github.io/tap-test/?tag=tag-1&p=eyJ1c2VybmFtZSI...

Copy that URL → open NFC Tools app → Write → URL → paste it → tap your NFC sticker

Every time you sell:

Tap your phone to the NFC sticker → phone opens the URL automatically
QR code appears instantly with the right price & message
Buyer scans → pays in Venmo

Key improvements:

+ Works on iPhone and Android — no Web NFC needed
+ All tag config is encoded in the URL itself — no server, no database
+ Settings are saved in the browser so they reload next time
+ Buyer sees a clean full-screen QR page with an "Open Venmo Directly" button as backup