// Login theme rule: a login between 10:00 and 11:59 IST gets the light
// theme, every other time gets the dark theme.
// Uses India time no matter where the server or the user is.

export const getThemeForNow = (date = new Date()) => {
    const hour = Number(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            hour: "numeric",
            hourCycle: "h23",
        }).format(date)
    );

    return hour >= 10 && hour < 12 ? "light" : "dark";
};
