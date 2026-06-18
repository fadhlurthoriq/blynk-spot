export default async function handler(req, res) {

    const token = process.env.BLYNK_TOKEN;

    if (!token) {
        return res.status(400).json({
            online: false,
            error: "BLYNK_TOKEN environment variable is not configured."
        });
    }

    try {
        // Cek koneksi hardware + fetch semua pin secara paralel
        const [
            connectedText,
            water, temp, humid, mode, relay, blue, green, tank
        ] = await Promise.all([
            fetch(`https://blynk.cloud/external/api/isHardwareConnected?token=${token}`)
                .then(r => { if (!r.ok) throw new Error(`Status check failed: HTTP ${r.status}`); return r.text(); }),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&pin=V0`)
                .then(r => { if (!r.ok) throw new Error(`V0 failed: HTTP ${r.status}`); return r.text(); }),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&pin=V1`)
                .then(r => { if (!r.ok) throw new Error(`V1 failed: HTTP ${r.status}`); return r.text(); }),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&pin=V2`)
                .then(r => { if (!r.ok) throw new Error(`V2 failed: HTTP ${r.status}`); return r.text(); }),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&pin=V3`)
                .then(r => { if (!r.ok) throw new Error(`V3 failed: HTTP ${r.status}`); return r.text(); }),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&pin=V4`)
                .then(r => { if (!r.ok) throw new Error(`V4 failed: HTTP ${r.status}`); return r.text(); }),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&pin=V5`)
                .then(r => { if (!r.ok) throw new Error(`V5 failed: HTTP ${r.status}`); return r.text(); }),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&pin=V6`)
                .then(r => { if (!r.ok) throw new Error(`V6 failed: HTTP ${r.status}`); return r.text(); }),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&pin=V7`)
                .then(r => { if (!r.ok) throw new Error(`V7 failed: HTTP ${r.status}`); return r.text(); }),
        ]);

        const online = connectedText.trim() === 'true';

        res.status(200).json({
            online,
            soil:        Number(water),
            temperature: Number(temp),
            humidity:    Number(humid),
            mode:        Number(mode),
            relay:       Number(relay),
            blue:        Number(blue),
            green:       Number(green),
            tank:        Number(tank),
        });

    } catch (error) {
        res.status(500).json({
            online: false,
            error: error.message
        });
    }
}