# iOS Shortcut — quick expense entry

Goal: tap the Shortcut (or say "Hey Siri, log expense"), answer 2-3 prompts,
done — no app to open.

## Find your category/subcategory/account IDs first

Visit this in Safari once (replace with your real URL/token):
```
https://script.google.com/macros/s/YOUR_ID/exec?action=categories&token=YOUR_TOKEN
```
Note down the `categoryId` values you'll use most (e.g. Food & Dining =
`C002`, its Cafes subcategory = `C002-S03`). Also fetch `?action=accounts`
for your `accountId`s. You'll pick from these in the Shortcut.

## Build the Shortcut

Open the Shortcuts app → + → add these actions in order:

1. **Ask for Input** — Prompt: "Amount?", Input Type: Number
2. **Ask for Input** — Prompt: "What for?", Input Type: Text (this becomes
   the merchant/description)
3. **Choose from Menu** — Menu items: your most-used category display names
   (e.g. "Food & Dining", "Transportation", "Shopping"...). Under each menu
   item, add a **Text** action containing that category's `categoryId`
   (e.g. `C002`). This is the simplest way to map a friendly tap to the
   stable ID the backend expects.
4. **Get Current Date** — leave default (Shortcuts can format it next)
5. **Format Date** — Date Format: Custom → `yyyy-MM-dd`
6. **Text** — build the JSON body, referencing the outputs of the steps
   above (tap the blue variable chips to insert them):
   ```json
   {
     "action": "addTransaction",
     "token": "YOUR_TOKEN",
     "transaction": {
       "date": "[Formatted Date]",
       "transactionType": "EXPENSE",
       "amount": [Provided Input from step 1],
       "currency": "INR",
       "categoryId": "[Chosen category ID from step 3]",
       "accountId": "A002",
       "merchantName": "[Provided Input from step 2]",
       "source": "IOS_SHORTCUT"
     }
   }
   ```
   Replace `"A002"` with your default account ID, or add another "Choose
   from Menu" step if you want to pick the account each time too.
7. **Get Contents of URL**
   - URL: your Apps Script Web App URL (the same `.../exec` URL)
   - Method: POST
   - Headers: `Content-Type` → `text/plain`
   - Request Body: Raw → the Text output from step 6
8. **Show Notification** (optional) — Title: "Saved", Body: something like
   "Logged expense" — confirms it worked without opening anything.

Name the Shortcut "Log Expense", add it to your Home Screen, and optionally
record a Siri phrase for it.

## Notes

- The token is visible inside the Shortcut itself (in the JSON body you
  typed). Shortcuts are stored locally on your device / iCloud, not public,
  so this is reasonable — but don't share the Shortcut file with anyone
  without stripping the token first.
- If you want fewer taps, you can hardcode a single default category and
  skip step 3 entirely — reclassify occasionally from the app instead.
- For income or investments, either build a second Shortcut ("Log Income")
  with `"transactionType": "INCOME"`, or add a "Choose from Menu" for type
  too.
