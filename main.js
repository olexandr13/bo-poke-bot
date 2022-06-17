const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios').default;

const telegramToken = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(telegramToken, { polling: true });

const usernames = {
  'Yevhenii Onipko': '@yevheniionipko',
  'Viktoria Kozachenko': '@victoria_k18',
  'Kostya Pogromskiy': '@ssgkos',
  'Denys Bogatyrchuk': '@jksdtyrtjk',
  'Artem Lakhurov': '@artem_lkv',
};

async function checkIssues() {
  try {
    const response = await axios.get(
      `https://velasnetwork.atlassian.net/rest/api/latest/search?jql=status='Code review' AND project = 'VTX'`,
      {
        auth: {
          username: 'oleksandr.pelykh@gmail.com',
          password: process.env.JIRA_TOKEN,
        },
      }
    );
    return response.data.issues;
  } catch (error) {
    console.error(error);
  }
}

function getDaysWordEnding(daysAmount) {
  if (daysAmount === 1) return 'день';
  if (daysAmount === 2 || daysAmount === 3 || daysAmount === 4) return 'дня';
  if (daysAmount >= 5) return 'дней';
}

function calcDaysPassedTillLastUpdate(issue) {
  const lastUpdatedDate = new Date(issue.fields.updated);
  const now = new Date();
  const timePassed = now - lastUpdatedDate;
  return Math.floor(timePassed / (1000 * 60 * 60 * 24));
}

const botTestTrigger = 'bot:test-alive';
const botTimeTrigger = 'bot:time';

bot.on('message', async (msg) => {
  const codeReviewTrigger = 'bot:codereview';

  // do nothing on weekend
  if (new Date().getDay() === 6 || new Date().getDay() === 0) {
    bot.sendMessage(msg.chat.id, 'I don`t work on weekends, sorry');
    return;
  }

  if (msg?.text?.toString().toLowerCase().includes(codeReviewTrigger)) {
    checkIssues()
      .then((issues) => {
        let recentlyUpdatedIssuesAmout = 0;
        let outDatedIssuesAmount = 0;

        for (let i = 0; i < issues.length; i++) {
          const issue = issues[i];

          // skip for subtasks
          if (issue.fields.issuetype.subtask) continue;

          // if task was updated less than 2 days ago
          const amountOfDaysPassed = calcDaysPassedTillLastUpdate(issue);
          if (amountOfDaysPassed < 2) {
            console.log(`Issue ${issue.key} was updated ${amountOfDaysPassed} days ago`);
            recentlyUpdatedIssuesAmout += 1;
            continue;
          }

          outDatedIssuesAmount += 1;
          
          console.log(`Outdated issue: ${issue.key} - ${issue.fields.summary}`);
          setTimeout(() => {
            bot.sendMessage(
              msg.chat.id,
              `${
                usernames[issue.fields.assignee?.displayName] || ''
              }\nЭта задача висит в Code Review уже ${amountOfDaysPassed} ${getDaysWordEnding(amountOfDaysPassed)}\n\n${
                issue.fields.summary
              }\nhttps://velasnetwork.atlassian.net/browse/${issue.key}`
            );
          }, 1000 * i);
        }

        if (!outDatedIssuesAmount) {
          let okMessage = '';
          if (!issues.length) okMessage += '\nВсе задачи прошли Code Review! Это успех!';
          if (recentlyUpdatedIssuesAmout) okMessage = `Задач в статусе Code Review: ${recentlyUpdatedIssuesAmout}`;
          if (okMessage) {
            bot.sendMessage(msg.chat.id, okMessage);
          }
        }
      })
      .catch((error) => {
        {
          console.log(error);
        }
      });
  }
});

bot.on('message', async (msg) => {
  if (msg?.text?.toString().toLowerCase().includes(botTestTrigger)) {
    bot.sendMessage(msg.chat.id, 'I am alive');
    return;
  }
});

bot.on('message', async (msg) => {
  if (msg?.text?.toString().toLowerCase().includes(botTimeTrigger)) {
    bot.sendMessage(msg.chat.id, new Date().toString());
    return;
  }
});

// bot.on('message', async (msg) => {
//   const botPollingTrigger = 'bot:polling';
//   if (msg.text.toString().toLowerCase().includes(botPollingTrigger)) {
//     setInterval(async () => {
//       console.log('testing...');
//       bot.sendMessage(msg.chat.id, 'I am running like a cron');
//     }, 1000 * 15);
//   }
// });
