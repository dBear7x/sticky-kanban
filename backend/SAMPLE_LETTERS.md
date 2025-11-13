# SAMPLE_LETTERS.md

Purpose
-------
This file provides a simple example and instructions for creating the Excel file the backend expects. Place your Excel workbook at `backend/data/letters.xlsx` (relative to the project root), or set the environment variable `EXCEL_PATH` to point to a different path.

Backend behavior summary
------------------------
- The backend reads the *first worksheet* in the workbook.
- It looks for a column header named `letter` (case-insensitive). If no exact `letter` header exists, it will attempt to use any header that contains the string `letter`.
- Each non-empty cell in the `letter` column becomes one sticky note entry.
- The backend trims whitespace around cell values and ignores empty values.
- If an `id` column exists, the backend will use it for each item's `id`; otherwise it will assign sequential ids starting at 1 based on row order.
- The backend caches results and will re-read the file when the file modification time changes.

Excel format (recommended)
--------------------------
- File type: `.xlsx` (recommended). Common Excel formats are supported by the `xlsx` library.
- The first row should be the header row.
- Required column (case-insensitive): `letter`
- Optional column: `id` (useful to maintain stable ids across updates)

Example worksheet (first sheet)
-------------------------------
Header row (row 1): put column names here. The backend will read the first sheet and inspect this row.

| id (optional) | letter                    |
|---------------|---------------------------|
| 1             | Buy groceries             |
| 2             | Call Alice about meeting  |
|               | Fix signup bug            |
|               | Finish slides for demo    |
| 5             | Plan Q4 roadmap           |

Notes on the example:
- The third and fourth rows don't have `id` values; the backend will assign ids by row order when no `id` column value is present.
- Any empty or whitespace-only `letter` cells are ignored.

How to create & save the file
-----------------------------
1. Open Excel, Google Sheets, LibreOffice Calc, or similar.
2. Create the first row with a header `letter` (and `id` if you want stable ids).
3. Add one note per row under the `letter` column.
4. Save/export as `letters.xlsx`.
   - If using Google Sheets: File → Download → Microsoft Excel (.xlsx)
   - If using Excel: File → Save As → choose `.xlsx`
5. Place the file at `backend/data/letters.xlsx` (create the `data` directory if missing), or set the environment variable:
   - `EXCEL_PATH=/absolute/path/to/your/letters.xlsx` (or use a relative path when starting the backend)

Testing the backend
-------------------
Once the backend is running (default port 3000), verify it can read your file by visiting or requesting:

- Browser: http://localhost:3000/api/letters
- curl:
  - `curl http://localhost:3000/api/letters`

Expected JSON shape:
- `letters`: array of objects with `id` and `text` properties
- `updatedAt`: ISO timestamp of last parse
- `source`: file name (e.g., `letters.xlsx`)

Troubleshooting
---------------
- If the API returns an empty `letters` array:
  - Confirm the file exists at `backend/data/letters.xlsx` or that `EXCEL_PATH` points to the right file.
  - Open the workbook and ensure the first sheet has a header named `letter` (case-insensitive).
  - Ensure cells under `letter` are not empty.
- On Windows, Excel sometimes locks files while open in the application. Close Excel or make a copy of the workbook before reading.
- File permission issues or locked files may produce warnings in the backend logs.
- Check backend console logs — the backend attempts an initial load on startup and logs the number of loaded letters or errors.

Optional: CSV
-------------
If you prefer CSV during testing, you can create a simple CSV with a header `letter` and sample rows. Be aware that the backend is configured to read Excel workbooks (`.xlsx`) by default. If you use CSV, either convert it to `.xlsx` or change your `EXCEL_PATH` to point directly to the CSV and ensure the `xlsx` library can parse it in your environment.

Tips for content
----------------
- Keep each sticky note short (one or a few short sentences) for best visual results.
- Avoid extremely long paragraphs; if needed, the frontend will wrap long text but layout may become less "sticky-like".
- Use an `id` column when you want stable mapping across updates (helps with frontend keyed rendering).

If you want, I can:
- Produce a small sample `letters.xlsx` contents in CSV form that you can copy into Excel and save.
- Add a debug endpoint to the backend to show which header was detected and rows that were ignored.