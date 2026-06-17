export default async function handler(req, res) {

    const token = process.env.BLYNK_TOKEN;

    if (!token) {
        return res.status(400).json({
            online: false,
            error: "BLYNK_TOKEN environment variable is not configured."
        });
    }

    try {
        const [connectedText, pinsText] = await Promise.all([
            fetch(`https://blynk.cloud/external/api/isHardwareConnected?token=${token}`)
                .then(r => {
                    if (!r.ok) throw new Error(`Status check failed: HTTP ${r.status}`);
                    return r.text();
                }),
            fetch(`https://blynk.cloud/external/api/get?token=${token}&V0&V1&V2&V3&V4&V5&V6&V7`)
                .then(r => {
                    if (!r.ok) throw new Error(`Pins data retrieval failed: HTTP ${r.status}`);
                    return r.text();
                })
        ]);

        const online = (connectedText.trim() === 'true');

        let pinsData = {};
        try {
            pinsData = JSON.parse(pinsText);
        } catch (e) {
            throw new Error(`Invalid JSON format received from Blynk: ${pinsText}`);
        }

        const getPinValue = (pinName) => {
            const upper = pinName.toUpperCase();
            const lower = pinName.toLowerCase();
            if (pinsData[upper] !== undefined) return pinsData[upper];
            if (pinsData[lower] !== undefined) return pinsData[lower];
            return null;
        };

        const water = getPinValue('V0');
        const temp = getPinValue('V1');
        const humid = getPinValue('V2');
        const mode = getPinValue('V3');
        const relay = getPinValue('V4');
        const blue = getPinValue('V5');
        const green = getPinValue('V6');
        const tank = getPinValue('V7');

        res.status(200).json({
            online,
            soil: water !== null ? Number(water) : null,
            temperature: temp !== null ? Number(temp) : null,
            humidity: humid !== null ? Number(humid) : null,
            mode: mode !== null ? Number(mode) : null,
            relay: relay !== null ? Number(relay) : null,
            blue: blue !== null ? Number(blue) : null,
            green: green !== null ? Number(green) : null,
            tank: tank !== null ? Number(tank) : null
        });

    } catch (error) {
        res.status(500).json({
            online: false,
            error: error.message
        });
    }
}