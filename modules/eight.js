var eight = function(dbot) {
    var eightBallResponses = ["It is certain.",
                               "It is decidedly so.",
                               "Without a doubt.",
                               "Yes – definitely.",
                               "You may rely on it.",
                               "As I see it, yes.",
                               "Most likely.",
                               "Outlook good.",
                               "Signs point to yes.",
                               "Yes.",
                               "Reply hazy, try again.",
                               "Ask again later.",
                               "Better not tell you now.",
                               "Cannot predict now.",
                               "Concentrate and ask again.",
                               "Don't count on it.",
                               "My reply is no.",
                               "My sources say no.",
                               "Outlook not so good.",
                               "Very doubtful."];

    return {
        'listener': function(data) {
            if(data.user == data.channel) {
                if(!(!(data.message.match(/.+\?$/)))) {
                    dbot.say(data.user, eightBallResponses.random());
                }
            } else {
                if(!(!(data.message.match(RegExp('^'+dbot.name+'[:,].+\\?$'))))) {
                    dbot.say(data.channel, data.user + ': ' + eightBallResponses.random());
                }
                
            }
        },
        'on': 'PRIVMSG'
    };
};

exports.fetch = function(dbot) {
    return eight(dbot);
};
