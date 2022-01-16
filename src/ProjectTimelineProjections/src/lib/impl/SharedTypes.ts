// ----------------------------------------------------------------------
// |
// |  SharedTypes.ts
// |
// |  David Brownell <db@DavidBrownell.com>
// |      2022-01-09 08:38:45
// |
// ----------------------------------------------------------------------
// |
// |  Copyright David Brownell 2022-22
// |  Distributed under the Boost Software License, Version 1.0. See
// |  accompanying file LICENSE_1_0.txt or copy at
// |  http://www.boost.org/LICENSE_1_0.txt.
// |
// ----------------------------------------------------------------------
export class Colors {
    private _colors = [
        "silver",
        "maroon",
        "purple",
        "green",
        "olive",
        "navy",
        "teal",
        "gray",
        "red",
        "fuchsia",
        "lime",
        "yellow",
        "blue",
        "aqua",
    ];

    private _index = 0;

    GetColor = (): string => {
        const color = this._colors[this._index];
        this._index = (this._index + 1) % this._colors.length;
        return color;
    }

    Border = (
        width: number = 3,
        style: string = "solid",
    ): string => {
        return `border: ${width}px ${style} ${this.GetColor()};`;
    }
};


// ----------------------------------------------------------------------
export class StatsInfo<Type> {
    constructor(
        public readonly average: Type,
        public readonly min: Type,
        public readonly max: Type,
    ) {}
};


// ----------------------------------------------------------------------
export const default_days_in_sprint = 14;
export const default_points_per_unestimated_item = 8;
export const default_unestimated_velocity_factors: [number, number] = [0.5, 2];

export class Configuration {
    constructor(
        public any_sprint_boundary: Date,
        public days_in_sprint: number=default_days_in_sprint,
        public points_per_unestimated_item=default_points_per_unestimated_item,
        public use_previous_n_sprints_for_average_velocity: number | undefined=undefined,
        public unestimated_velocity_factors: [number, number]=default_unestimated_velocity_factors,
        public velocity_overrides: StatsInfo<number> | undefined=undefined,
    ) {}

    Copy = (): Configuration => {
        return new Configuration(
            this.any_sprint_boundary,
            this.days_in_sprint,
            this.points_per_unestimated_item,
            this.use_previous_n_sprints_for_average_velocity,
            this.unestimated_velocity_factors,
            this.velocity_overrides,
        );
    }
};
