export default async function handler(req, res) {

    const token = process.env.BLYNK_TOKEN;

    try {

        const [
            water,
            temp,
            humid,
            mode,
            relay,
            blue,
            green,
            tank
        ] = await Promise.all([

            fetch(`https://blynk.cloud/external/api/get?token=${token}&V0`)
                .then(r => r.text()),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&V1`)
                .then(r => r.text()),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&V2`)
                .then(r => r.text()),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&V3`)
                .then(r => r.text()),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&V4`)
                .then(r => r.text()),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&V5`)
                .then(r => r.text()),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&V6`)
                .then(r => r.text()),

            fetch(`https://blynk.cloud/external/api/get?token=${token}&V7`)
                .then(r => r.text())
        ]);

        res.status(200).json({

            online: true,

            soil: Number(water),

            temperature: Number(temp),

            humidity: Number(humid),

            mode: Number(mode),

            relay: Number(relay),

            blue: Number(blue),

            green: Number(green),

            tank: Number(tank)

        });

    } catch (error) {

        res.status(500).json({

            online: false,
            error: error.message

        });

    }

}