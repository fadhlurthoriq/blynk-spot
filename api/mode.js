export default async function handler(req, res) {

    const token = process.env.BLYNK_TOKEN;

    const { mode } = req.body;

    try {

        await fetch(

            `https://blynk.cloud/external/api/update?token=${token}&V3=${mode}`

        );

        res.status(200).json({

            success: true

        });

    } catch (error) {

        res.status(500).json({

            success: false,
            error: error.message

        });

    }

}