# CSP Experiment – Learning medium vs. immediate recall

A single-page data-collection instrument for the IB Collaborative Sciences Presentation.

**Research question:** Which learning medium produces the best immediate recall of new information: reading text, watching a narrated slideshow ("video"), or listening to audio narration?

| | |
|---|---|
| **IV** | Learning medium: `text` / `video` / `audio` (3 categorical levels, between-subjects) |
| **DV** | Quiz score: number correct out of 12 (plus the percentage) |
| **Assignment** | Done by the site: permuted blocks of 3 on the server, so the groups stay balanced |
| **Controlled** | Same 8-part script word for word, same total exposure (8 × 24 s = 3 min 12 s, advances automatically with no pause or replay), identical 12-question quiz, fictional topic (no prior knowledge) |
| **Test** | One-way ANOVA (α = 0.05), shown as a column chart |

Files:

- `index.html`: the whole website (participant flow and researcher results view)
- `apps-script/Code.gs`: the cloud data store (Google Apps Script, which writes to a Google Sheet you own)

---

## 1. One-time setup (about 10 minutes)

### a) Cloud data store (Google Sheet + Apps Script)

1. Create a new Google Sheet, for example "CSP Results".
2. **Extensions → Apps Script**. Delete the starter code and paste in all of `apps-script/Code.gs`.
3. Change `ADMIN_KEY` at the top to your own secret word. You'll need it to open the results page.
4. Click **Save**. In the function dropdown next to **Run** (it may say `myFunction` or `doGet`), choose **`setup`** and click **Run**. Accept the permission prompt (Advanced → Go to project → Allow). Row 1 of the Sheet should now show the headers `medium, score, total, percent, …` on a tab named `Responses`. Reload the Sheet if they don't appear straight away.
5. **Deploy → New deployment →** gear icon **→ Web app**
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**. This is required so participants don't need to sign in.
6. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

> If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version** so the URL stays the same.

### b) Connect the website

Open `index.html`, find `SCRIPT_URL: ''` near the top of the `<script>` section, and paste your URL between the quotes. The yellow "Demo mode" banner will disappear.

### c) Get a single shareable link (GitHub Pages, free)

This repo already has a GitHub remote. Run:

```bash
git add . && git commit -m "CSP experiment" && git push -u origin main
```

On GitHub, go to **Settings → Pages → Source: Deploy from a branch → `main` / root**. Your link will be
`https://trenttimmerman82.github.io/CSP-Project/`

- The results view is at the same link plus `#results`. It is protected by `ADMIN_KEY`.
- To test without a data store, open `index.html` directly. Demo mode saves data to that browser only.

## 2. Running sessions

- Participants open the link, optionally type their initials, and press **Start**. After that everything runs on its own: assignment → material → quiz → result.
- Participants in the audio and video groups do a sound check first. Headphones help a lot in a classroom.
- On a shared device, press **Finish (next participant can start)** between people.
- **If saving fails** (network or school-filter problems), the participant sees **Download my result**, which saves a one-row CSV. Collect those files and use **Import backup file(s)** on the results page. Duplicates are ignored automatically. The device also retries saving in the background the next time the page is opened.
- Participants never see the correct answers or the hypothesis. The result screen asks them not to share the questions.

## 3. Results and analysis

The results page (`#results`) shows:

- total responses
- the mean score per group
- n, SD, SE, min and max for each group
- a column chart with ±1 SE error bars (**Chart as PNG** exports it for your slide)
- a one-way ANOVA line: F, df and p
- the raw table of every response

It also has a checkbox to exclude flagged responses, for your Evaluation section.

**CSV – all data** gives one row per participant in long format. The first columns are `medium, score, total, percent`, followed by the timestamp, name and quality-control fields.

**CSV – ANOVA columns** gives one column per group (`Text, Video, Audio`), with scores underneath. This is the layout Excel expects:

- **Excel:** Data → Data Analysis → **Anova: Single Factor**. Select the three columns and tick "Labels in first row". (On Mac this needs the Analysis ToolPak add-in, which you enable once.)
- **Google Sheets:** Extensions → Add-ons → install **XLMiner Analysis ToolPak** → "Anova: Single Factor" on the same three columns.
- **Chart:** select the mean for each medium → Insert → Column chart.

Compare your spreadsheet's F and p with the numbers on the results page as a cross-check.

### Data columns

| column | meaning |
|---|---|
| `medium` | assigned condition (`text` / `video` / `audio`) |
| `score`, `total`, `percent` | correct answers, number of questions (12), score as a percentage |
| `timestamp`, `name` | when they submitted; optional initials |
| `participant_id` | random ID, used to remove duplicates |
| `exposure_seconds` | measured time spent on the material (should be about 192 for everyone, which is evidence the control worked) |
| `quiz_seconds` | time taken on the quiz |
| `tab_switches` | times they left the tab during the material |
| `speech_overruns` | narration parts that hadn't finished when the time ran out (should be 0) |
| `interrupted` | 1 if they reloaded partway through the material, which restarts it |
| `tech_issue` | self-reported technical problem (`yes` / `no`) |
| `assignment_source` | `server-block` (balanced randomisation), or `local-random` if the server couldn't be reached |
| `answers` | letters chosen for Q1–Q12 |

## 4. Points for your Evaluation slide

- Narration uses each device's built-in text-to-speech voice, so voice quality varies slightly between devices. The words and timing do not change.
- The "video" condition is a narrated slideshow of illustrative pictures, not recorded footage.
- Participants in the text condition can re-read within each 24-second part. That is a property of the medium, not a flaw, but you should mention it.
- Immediate recall only. No delayed retention test.
- Sample size and random assignment are limitations: small groups mean the ANOVA has low statistical power.
- The answer key is only lightly obscured in the page source. That is fine for a supervised class setting, but it is not tamper-proof.
