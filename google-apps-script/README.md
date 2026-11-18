# Google Sheets & Google Apps Script Setup Guide

This guide explains how to connect **ShramikSetu** to your own **Google Sheet** using **Google Apps Script** as a completely free, serverless REST API database!

---

## Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name the spreadsheet: **"ShramikSetu Odisha Database"**.
3. Rename the first sheet tab at the bottom to: `Applications`.

---

## Step 2: Open Apps Script Editor
1. In your Google Sheet, click **Extensions** in the top menu bar.
2. Click **Apps Script**.
3. A new tab will open with the code editor.
4. Delete any existing code in the editor (`function myFunction() { ... }`).
5. Copy the entire contents of `Code.gs` from `google-apps-script/Code.gs` in this repository and paste it into the editor.
6. Click the **Save** (💾 disk icon) button or press `Ctrl + S`.

---

## Step 3: Deploy as Web App
1. Click the blue **Deploy** button in the top right corner.
2. Select **New deployment**.
3. Click the gear icon (⚙️) next to *Select type* and choose **Web app**.
4. Fill in the deployment details:
   - **Description**: `ShramikSetu API v1`
   - **Execute as**: `Me (your email address)`
   - **Who has access**: `Anyone` *(Crucial: Select "Anyone" so the React app can read and write without authentication blocks!)*
5. Click **Deploy**.
6. When prompted, click **Authorize access**, choose your Google account, click **Advanced**, and then click **Go to Untitled project (unsafe)** to allow permissions.
7. Copy the **Web App URL** provided (it looks like `https://script.google.com/macros/s/AKfycb.../exec`).

---

## Step 4: Connect to ShramikSetu Web App
1. Open the **ShramikSetu** web portal in your browser.
2. Click on the **Google Sheet Sync** button or open **Settings** in the top right navbar.
3. Paste your **Web App URL** into the input field.
4. Click **Test & Connect**.
5. You're done! All additions, status updates, and deletions will now automatically sync in real-time with your Google Sheet!

---

## Features Handled by Apps Script:
- **`getAll`**: Fetches all active applications across all blocks.
- **`add`**: Saves new card, renewal, marriage, maternity, education, or death benefit applications.
- **`update`**: Updates application status (e.g. In Progress, Query Replied, Approved).
- **`deleteOnComplete`**: When an application is marked **Completed**, it is automatically archived to the `Completed_Archive` tab and deleted from active applications, fulfilling the project specification!
- **`batchImport`**: Imports entire block-wise Excel / CSV files into the Sheet in one click.

