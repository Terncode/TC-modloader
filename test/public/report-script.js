console.log("This incident has been reported!");

(async () => {
    await fetch(`${origin}/report`, {
        method: "POST",
    });
})();
