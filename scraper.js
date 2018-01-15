var Xray = require('x-ray');
var x = Xray();
var fs = require('fs');

x('https://stackoverflow.com/users/5806646/mikhail-shabrikov?tab=tags', '.user-tags',
  {
    tag: x('.user-tags', ['a']),
    score: x('.user-tags', ['.answer-votes'])
  }
)
.paginate('.user-tab-paging a@href')
.limit(2)
(function(error, result) {
  if (error) {
    return console.log('error during page scrapping', error);
  }

  var scores = {};

  result.forEach(function(page) {
    page.score.forEach(function(score, index) {
      const scoreAsNumber = parseInt(score, 10);

      if (scoreAsNumber) {
        scores[page.tag[index]] = scoreAsNumber;
      }
    })
  });

  fs.writeFileSync('./scores.json', JSON.stringify(scores), 'utf-8', function (writeFileError) {
    if (writeFileError) {
      return console.log('error during file writing', writeFileError);
    }

    console.log("File saved!");
  });
});
