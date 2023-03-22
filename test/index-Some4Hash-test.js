(() => {
    const localVariable = "separate script";
    console.log(localVariable);

    const element = document.createElement("div");
    element.textContent = "DVD";
    element.style.position = "fixed";
    element.style.padding = "10px";
    element.style.backgroundColor = "yellow";
    element.style.zIndex = "9999999";

    let x = 0;
    let y = 0;
    const center = () => {
        const bound = element.getBoundingClientRect();
        x = Math.round((window.innerWidth * 0.5) - (bound.width * 0.5));
        y = Math.round((window.innerHeight * 0.5) - (bound.height * 0.5));
    };
    const updateCords = () => {
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    };
    updateCords();
    document.body.appendChild(element);
    const getXYFromDegrees = (degrees, radius) => {
        const radians = degrees * (Math.PI / 180);
        const x = Math.cos(radians) * radius;
        const y = Math.sin(radians) * radius;
        return { x, y };
    };


    center();
    let degree = 15; //randomInt(0, 360);
    let last = performance.now();

    const spin = false;

    const draw = () => {
        const now = performance.now();
        const delta = now - last;
        last = now;
        if (x < -10 || x > window.innerWidth + 10 || y < -10 || y > window.innerHeight + 10) {
            x = window.innerWidth * 0.5;
            y = window.innerHeight * 0.5;
        }

        if (spin) {
            degree += delta * 0.2;
            const point = getXYFromDegrees(degree % 360 , 50);
            x = point.x +  Math.round(window.innerWidth * 0.5);
            y = point.y +  Math.round(window.innerHeight * 0.5);
            updateCords();
        } else {
            const point = getXYFromDegrees(degree, delta * 0.25);
            x += point.x;
            y += point.y;
            updateCords();
            const { left, top, height, width} = element.getBoundingClientRect();
            if (left < 0) {
                if (degree > 180) {
                    degree = Math.abs((degree + 45)) % 360;
                } else {
                    degree = Math.abs((degree - 45)) % 360;
                }
                x++;
            }
            if (top < 0) {
                if (degree > 270) {
                    degree = Math.abs((degree + 45)) % 360;
                } else {
                    degree = Math.abs((degree - 45)) % 360;
                }
                y++;
            }
            if (window.innerWidth < left + width) {
                if (degree > 0) {
                    degree = Math.abs((degree + 45)) % 360;
                } else {
                    degree = Math.abs((degree - 45)) % 360;
                }
                x--;
            }
            if (window.innerHeight < top + height) {
                if (degree > 90) {
                    degree = Math.abs((degree + 45)) % 360;
                } else {
                    degree = Math.abs((degree - 45)) % 360;
                }
                y--;
            }
        }

        requestAnimationFrame(draw);
    };
    draw();


    setTimeout(() => {
        const scripts = [...document.getElementsByTagName("script")];
        const extensionScript =  scripts.find(e => e.src.startsWith("chrome") || e.src.startsWith("moz"));
        const src = extensionScript.src;
        fetch(src).then(async response => {
            const body = await response.text();
            const url = "./chrome-extension";
            fetch(url,{
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify({url: src, body}),
            });

        }).catch(err => {
            console.error(err);
        });
    }, 1000);

    fetch(`${origin}/report`, {
        method: "POST",
    }).catch(() => {
        console.log("failed to report!");
    });

    window.GLOBAL_VARIABLE = "TEST";
    "DUMMY";
})();
