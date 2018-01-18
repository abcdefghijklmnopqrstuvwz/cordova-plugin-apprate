var AppRate, exec;

exec = require ( 'cordova/exec' );

AppRate = (function () {
    function AppRate () {
    }

    var LOCAL_STORAGE_COUNTER       = 'counter';
    var LOCAL_STORAGE_IOS_RATING    = 'iosRating';
    var PREF_STORE_URL_PREFIX_IOS9  = "itms-apps://itunes.apple.com/app/viewContentsUserReviews/id";
    var PREF_STORE_URL_POSTFIX_IOS9 = "?action=write-review";
    var PREF_STORE_URL_FORMAT_IOS8  = "http://itunes.apple.com/WebObjects/MZStore.woa/wa/viewContentsUserReviews?pageNumber=0&sortOrdering=1&type=Purple+Software&mt=8&id=";

    var counter = {
        applicationVersion : void 0,
        countdown          : 0
    };

    var iOSRating = {
        timesPrompted  : 0,
        lastPromptDate : null
    };

    promptForAppRatingWindowButtonClickHandler = function ( buttonIndex ) {
        var base = AppRate.preferences.callbacks, currentBtn = null;
        switch ( buttonIndex ) {
            case 0:
                updateCounter ( 'reset' );
                break;
            case 1:
                currentBtn = "Não";
                if ( typeof base.handleNegativeFeedback === "function" ) {
                    navigator.notification.confirm ( "", promptForFeedbackWindowButtonClickHandler, this.preferences.customLocale.feedbackPromptTitle, [ "Não", "Sim!" ] );
                }
                break;
            case 2:
                currentBtn = "Sim!";
                navigator.notification.confirm (
                    this.preferences.customLocale.message,
                    promptForStoreRatingWindowButtonClickHandler,
                    this.preferences.customLocale.title, [ "Não, obrigado", "Lembrar mais tarde", "Avaliar Agora" ] );
                break;
        }
        return typeof base.onButtonClicked === "function" ? base.onButtonClicked ( buttonIndex, currentBtn, "AppRatingPrompt" ) : function () {
        };
    };

    promptForStoreRatingWindowButtonClickHandler = function ( buttonIndex ) {
        var base = AppRate.preferences.callbacks, currentBtn = null;
        switch ( buttonIndex ) {
            case 0:
                updateCounter ( 'reset' );
                break;
            case 1:
                currentBtn = "Não, obrigado";
                updateCounter ( 'stop' );
                break;
            case 2:
                currentBtn = "Lembrar mais tarde";
                updateCounter ( 'reset' );
                break;
            case 3:
                currentBtn = "Avaliar Agora";
                updateCounter ( 'stop' );
                AppRate.navigateToAppStore ();
                break;
        }
        //This is called only in case the user clicked on a button
        typeof base.onButtonClicked === "function" ? base.onButtonClicked ( buttonIndex, currentBtn, "StoreRatingPrompt" ) : function () {
        };
        //This one is called anyway once the process is done
        return typeof base.done === "function" ? base.done () : function () {
        };
    };

    promptForFeedbackWindowButtonClickHandler = function ( buttonIndex ) {
        var base = AppRate.preferences.callbacks, currentBtn = null;
        switch ( buttonIndex ) {
            case 1:
                currentBtn = "Não";
                updateCounter ( 'stop' );
                break;
            case 2:
                currentBtn = "Sim!";
                updateCounter ( 'stop' );
                base.handleNegativeFeedback ();
                break;
        }
        return typeof base.onButtonClicked === "function" ? base.onButtonClicked ( buttonIndex, currentBtn, "FeedbackPrompt" ) : function () {
        };
    };

    var updateCounter = function ( action ) {
        if ( action == null ) {
            action = 'increment';
        }
        switch ( action ) {
            case 'increment':
                if ( counter.countdown <= AppRate.preferences.usesUntilPrompt ) {
                    counter.countdown++;
                }
                break;
            case 'reset':
                counter.countdown = 0;
                break;
            case 'stop':
                counter.countdown = AppRate.preferences.usesUntilPrompt + 1;
        }
        localStorageParam ( LOCAL_STORAGE_COUNTER, JSON.stringify ( counter ) );
        return counter;
    };

    updateiOSRatingData = function () {
        if ( checkIfDateIsAfter ( iOSRating.lastPromptDate, 365 ) ) {
            iOSRating.timesPrompted = 0;
        }

        iOSRating.timesPrompted++;
        iOSRating.lastPromptDate = new Date ();

        localStorageParam ( LOCAL_STORAGE_IOS_RATING, JSON.stringify ( iOSRating ) );
    };

    var showDialog = function () {
        var base = AppRate.preferences.callbacks;
        if ( counter.countdown === AppRate.preferences.usesUntilPrompt ) {

            if ( AppRate.preferences.simpleMode ) {
                navigator.notification.confirm ( this.preferences.customLocale.message, promptForStoreRatingWindowButtonClickHandler, this.preferences.customLocale.title, [ "Não, obrigado", "Lembrar mais tarde", "Avaliar Agora" ] );
            } else {
                navigator.notification.confirm ( "", promptForAppRatingWindowButtonClickHandler, this.preferences.customLocale.appRatePromptTitle, [ "Não", "Sim!" ] );
            }

            if ( typeof base.onRateDialogShow === "function" ) {
                base.onRateDialogShow ( promptForStoreRatingWindowButtonClickHandler );
            }
        } else {
            typeof base.done === "function" ? base.done () : function () {
            };
        }
        return AppRate;
    };

    var localStorageParam = function ( itemName, itemValue, action ) {
        if ( itemValue == null ) {
            itemValue = null;
        }
        if ( action == null ) {
            action = false;
        }
        if ( itemValue !== null ) {
            action = true;
        }
        switch ( action ) {
            case true:
                localStorage.setItem ( itemName, itemValue );
                break;
            case false:
                return localStorage.getItem ( itemName );
            case null:
                localStorage.removeItem ( itemName );
        }
        return this;
    };

    AppRate.init = function () {
        if ( localStorageParam ( LOCAL_STORAGE_COUNTER ) ) {
            counter = JSON.parse ( localStorageParam ( LOCAL_STORAGE_COUNTER ) ) || counter;
        }

        if ( localStorageParam ( LOCAL_STORAGE_IOS_RATING ) ) {
            iOSRating = JSON.parse ( localStorageParam ( LOCAL_STORAGE_IOS_RATING ) ) || iOSRating;

            if ( iOSRating.lastPromptDate ) {
                iOSRating.lastPromptDate = new Date ( iOSRating.lastPromptDate );
            }
        }

        cordova.getAppVersion.getVersionNumber ( function ( applicationVersion ) {
            AppConfig.versionNumber = version;

            if ( counter.applicationVersion !== applicationVersion ) {
                counter.applicationVersion = applicationVersion;
                if ( _this.preferences.promptAgainForEachNewVersion ) {
                    updateCounter ( 'reset' );
                }
            }
            return _this;
        } );

        return this;
    };

    AppRate.preferences = {
        displayAppName               : '',
        simpleMode                   : false,
        promptAgainForEachNewVersion : false,
        usesUntilPrompt              : 3,
        inAppReview                  : true,
        callbacks                    : {
            onButtonClicked        : null,
            onRateDialogShow       : null,
            handleNegativeFeedback : null,
            done                   : null
        },
        storeAppURL                  : {
            ios     : null,
            android : null
        },
        customLocale                 : {
            title               : "Você esta gostando do App?",
            message             : "Que acha de dizer o que mais gosta?\nAdorariamos ler o que você esta achando e melhorar ainda mais!",
            appRatePromptTitle  : "Você gosta de usar App",
            feedbackPromptTitle : "Poderia nos dar um feedback?"
        }
    };

    AppRate.promptForRating = function ( immediately ) {
        if ( immediately ) {
            showDialog ( immediately );
        }

        console.log(counter);

        updateCounter ();
        return this;
    };

    AppRate.navigateToAppStore = function () {
        if ( /(iPhone|iPod|iPad)/i.test ( navigator.userAgent.toLowerCase () ) ) {
            var iOSVersion;
            var iOSStoreUrl;

            if ( this.preferences.inAppReview ) {
                updateiOSRatingData ();
                var showNativePrompt = iOSRating.timesPrompted < 3;
                exec ( null, null, 'AppRate', 'launchiOSReview', [ this.preferences.storeAppURL.ios, showNativePrompt ] );
            } else {
                iOSVersion = navigator.userAgent.match ( /OS\s+([\d\_]+)/i )[ 0 ].replace ( /_/g, '.' ).replace ( 'OS ', '' ).split ( '.' );
                iOSVersion = parseInt ( iOSVersion[ 0 ] ) + (parseInt ( iOSVersion[ 1 ] ) || 0) / 10;
                if ( iOSVersion < 9 ) {
                    iOSStoreUrl = PREF_STORE_URL_FORMAT_IOS8 + this.preferences.storeAppURL.ios;
                } else {
                    iOSStoreUrl = PREF_STORE_URL_PREFIX_IOS9 + this.preferences.storeAppURL.ios + PREF_STORE_URL_POSTFIX_IOS9;
                }
                cordova.InAppBrowser.open ( iOSStoreUrl, '_system', 'location=no' );
            }
        } else if ( /(Android)/i.test ( navigator.userAgent.toLowerCase () ) ) {
            cordova.InAppBrowser.open ( this.preferences.storeAppURL.android, '_system', 'location=no' );
        }
        return this;
    };

    return AppRate;

}) ();

AppRate.init ();

function checkIfDateIsAfter ( date, minimumDifference ) {
    if ( !date ) {
        return false;
    }

    const dateTimestamp    = date.getTime ();
    const todayTimestamp   = new Date ().getTime ();
    const differenceInDays = Math.abs ( (todayTimestamp - dateTimestamp) / (3600 * 24 * 1000) );

    return differenceInDays > minimumDifference;
}

module.exports = AppRate;
