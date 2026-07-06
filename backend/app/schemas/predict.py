from pydantic import BaseModel, Field

class LapPredictionInput(BaseModel):
    LapTime: float = Field(..., description="Current lap time in seconds")
    LapNumber: int = Field(..., description="Current lap number in the race")
    Stint: int = Field(..., description="Current stint number for the driver")
    Sector1Time: float = Field(..., description="Sector 1 time in seconds")
    Sector2Time: float = Field(..., description="Sector 2 time in seconds")
    Sector3Time: float = Field(..., description="Sector 3 time in seconds")
    TyreLife: float = Field(..., description="Number of laps completed on the current set of tyres")
    Position: int = Field(..., description="Current race position of the driver")
    Season: int = Field(..., description="Season/Year (e.g. 2024)")
    track_length_km: float = Field(..., description="Length of the track in kilometers")
    num_corners: int = Field(..., description="Number of corners on the circuit")
    race_laps: int = Field(..., description="Total number of laps in the race")
    race_distance_km: float = Field(..., description="Total race distance in kilometers")
    pit_lane_speed_limit_kmh: float = Field(..., description="Pit lane speed limit in km/h")
    pit_loss_delta_s: float = Field(..., description="Estimated time loss in pit lane in seconds")
    elevation_change_m: float = Field(..., description="Total elevation change of the circuit in meters")
    sc_active: int = Field(..., description="Safety Car active flag (1 for active, 0 for inactive)")
    vsc_active: int = Field(..., description="Virtual Safety Car active flag (1 for active, 0 for inactive)")
    red_flag: int = Field(..., description="Red flag active flag (1 for active, 0 for inactive)")
    laps_remaining: int = Field(..., description="Remaining laps in the race")
    race_pct: float = Field(..., description="Percentage of the race distance completed")
    stint_lap: int = Field(..., description="Number of laps completed in the current stint")
    lap_time_roll3: float = Field(..., description="Rolling average of the last 3 lap times in seconds")
    lap_time_delta_best: float = Field(..., description="Difference between current lap time and personal best in seconds")
    lap_time_delta_prev: float = Field(..., description="Difference between current lap time and previous lap time in seconds")
    compound_enc: int = Field(..., description="Encoded tyre compound")
    circuit_type_enc: int = Field(..., description="Encoded circuit type")
    overtaking_difficulty_enc: int = Field(..., description="Encoded overtaking difficulty score")
    tyre_stress_enc: int = Field(..., description="Encoded tyre stress rating")
    clockwise: int = Field(..., description="Direction of circuit (1 for clockwise, 0 for counter-clockwise)")
    fresh_tyre: int = Field(..., description="Fresh tyre flag (1 for fresh, 0 for used)")

    class Config:
        json_schema_extra = {
            "example": {
                "LapTime": 90.5,
                "LapNumber": 15,
                "Stint": 1,
                "Sector1Time": 30.2,
                "Sector2Time": 35.1,
                "Sector3Time": 25.2,
                "TyreLife": 15.0,
                "Position": 5,
                "Season": 2024,
                "track_length_km": 5.412,
                "num_corners": 15,
                "race_laps": 57,
                "race_distance_km": 308.238,
                "pit_lane_speed_limit_kmh": 80.0,
                "pit_loss_delta_s": 22.5,
                "elevation_change_m": 12.0,
                "sc_active": 0,
                "vsc_active": 0,
                "red_flag": 0,
                "laps_remaining": 42,
                "race_pct": 26.3,
                "stint_lap": 15,
                "lap_time_roll3": 91.0,
                "lap_time_delta_best": 0.8,
                "lap_time_delta_prev": 0.2,
                "compound_enc": 1,
                "circuit_type_enc": 2,
                "overtaking_difficulty_enc": 1,
                "tyre_stress_enc": 2,
                "clockwise": 1,
                "fresh_tyre": 0
            }
        }

class PredictionResponse(BaseModel):
    probability: float = Field(..., description="Estimated probability of making a pit stop this lap")
    should_pit: bool = Field(..., description="Decision recommending a pit stop based on the optimal threshold")
    threshold: float = Field(..., description="Optimal decision threshold loaded from the model pickle")
