// Instructions.js – Remote Memo CONNECT

export const ProjectInstructions = {
    title: "Remote Memo CONNECT – הגדרות פרויקט",
  
    goal: `מערכת תזכורות קוליות וטקסטואליות לאנשים עם בעיות זיכרון. 
  הודעות נשלחות ממכשיר למכשיר (P2P), מושמעות אוטומטית במועד מתוזמן, ומאובטחות באמצעות מנגנון סנכרון ו־Blockchain מקומי.`,
  
    platforms: ["Android 9.0+", "iOS 12.0+", "Web (לצורכי הדמיה בלבד)"],
  
    audience: [
      "אנשים עם לקויות זיכרון",
      "בני משפחה ומטפלים המעוניינים לשלוח הודעות תומכות"
    ],
  
    features: {
      messageCreation: [
        "הקלטת קול ו/או כתיבת טקסט",
        "בחירת תאריך ושעה לתזכורת",
        "שמירה מקומית (AsyncStorage)",
        "שליחה למכשיר אחר דרך peerId או בעתיד דרך Relay Server"
      ],
      messageReception: [
        "קבלת הודעות והפעלתן אוטומטית",
        "שמירה ביומן TRUST ובלוג הראשי",
        "מחיקת הודעות אוטומטית לפי זמן מוגדר ב־SettingsScreen"
      ],
      messageStatus: [
        "סטטוסים נתמכים: unread, pending, delivered, received, played, read, deleted_by_peer, alert triggered, alert receipt confirmed",
        "כל שינוי סטטוס נחתם מחדש עם hash ונשמר ב־Blockchain",
        "רענון סטטוסים כל 5 שניות"
      ],
      statusIndicator: "🔴 לא מסונכרן | 🟡 בתהליך | 🟢 מסונכרן",
      messageDisplay: [
        "הודעות נכנסות – שמאל, תכלת בהיר",
        "הודעות יוצאות – ימין, קרם בהיר",
        "הודעות שנמחקו ע״י peer – שקופות (50%)",
        "הודעות שנמחקו על ידי שני הצדדים – מוסתרות אך קיימות ב־Blockchain"
      ]
    },
  
    syncLayer: {
      description: "שכבת סנכרון הכוללת שני מנועים מתוזמנים:",
      engines: {
        useSyncEngine: {
          interval: "כל 4 שניות",
          logic: [
            "שליחת כל הודעות היוצאות (id + status)",
            "קבלת statusUpdates ועדכון הודעות",
            "שליחה מחדש של unread",
            "שינוי נורית: אם יש עדכון – idle, אחרת ok"
          ]
        },
        useLedgerSync: {
          interval: "כל 5 שניות",
          logic: [
            "בניית Ledger מקומי (id, status, hash)",
            "יצירת בלוק עם createBlock",
            "שליחה ל־peer והשוואת Ledgers",
            "בקשת הודעות חסרות עם requestMissingMessage",
            "עדכון סטטוסים שונים",
            "סימון deleted_by_peer עבור הודעות שנמחקו אצל peer",
            "verifyBlockchainMatch – קובע אם syncStatus = 'ok'"
          ]
        }
      }
    },
  
    trustLedger: {
      description: "מנגנון אימות מבוסס Blockchain לוקאלי",
      flow: [
        "כל הודעה נחתמת עם hashMessage (id, status, text, audioBase64)",
        "בלוק חדש נבנה עם createBlock וכולל: timestamp, ledger, previousHash, hash",
        "verifyBlockchainMatch בודק התאמה מלאה בין היסטוריות בלוקים",
        "רק בהתאמה מלאה → syncStatus = 'ok' → נורית ירוקה",
        "אם אין התאמה → syncStatus = 'idle' → נורית צהובה/אדומה"
      ]
    },
  
    messageSchema: {
      id: "string",
      shortName: "string",
      senderId: "string",
      receiverId: "string",
      date: "string",
      time: "string",
      text: "string",
      audioBase64: "string | optional",
      status: "unread | pending | delivered | received | played | read | alert triggered | alert receipt confirmed | deleted_by_peer",
      played: "boolean",
      source: "'local' | 'remote'",
      createdAt: "string",
      updatedAt: "string",
      hash: "string",
      signature: "string | optional"
    },
  
    tests: [
      "כל הודעה נבדקת עם hash מול peer",
      "יומן TRUST מציג כמה הודעות נוספו/עודכנו/נמחקו בכל סנכרון",
      "התראות קוליות נבדקות לפי sound + volume מה־Settings"
    ]
  };
  