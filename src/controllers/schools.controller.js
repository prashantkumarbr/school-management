import pool from "../db.js";
import { addSchoolSchema, listSchema } from "../validators/schools.schema.js";

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const addSchool = async (req, res, next) => {
  try {
    const { error, value } = addSchoolSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, address, latitude, longitude } = value;
    const sql =
      "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
    const [result] = await pool.execute(sql, [
      name,
      address,
      latitude,
      longitude,
    ]);

    const [rows] = await pool.execute(
      "SELECT id, name, address, latitude, longitude, created_at FROM schools WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "School with same name and address already exists." });
    }
    next(err);
  }
};

export const listSchools = async (req, res, next) => {
  try {
    const q = {
      latitude: parseFloat(req.query.latitude ?? req.query.lat),
      longitude: parseFloat(
        req.query.longitude ?? req.query.lng ?? req.query.lon
      ),
    };
    const { error, value } = listSchema.validate(q);
    if (error) {
      return res.status(400).json({
        error: "Valid latitude and longitude are required as query params.",
      });
    }

    const [rows] = await pool.execute(
      "SELECT id, name, address, latitude, longitude FROM schools"
    );

    const withDistances = rows
      .map((s) => {
        const d = haversineKm(
          value.latitude,
          value.longitude,
          Number(s.latitude),
          Number(s.longitude)
        );
        return { ...s, distance_km: Number(d.toFixed(3)) };
      })
      .sort((a, b) => a.distance_km - b.distance_km);

    res.json(withDistances);
  } catch (err) {
    next(err);
  }
};
