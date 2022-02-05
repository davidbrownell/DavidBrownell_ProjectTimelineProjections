<!--
----------------------------------------------------------------------
|
|  Settings.svelte
|
|  David Brownell <db@DavidBrownell.com>
|      2022-02-05 11:25:33
|
----------------------------------------------------------------------
|
|  Copyright David Brownell 2022
|  Distributed under the Boost Software License, Version 1.0. See
|  accompanying file LICENSE_1_0.txt or copy at
|  http://www.boost.org/LICENSE_1_0.txt.
|
----------------------------------------------------------------------
-->

<!--
----------------------------------------------------------------------
|
|  Code
|
----------------------------------------------------------------------
-->
<script lang=ts>
    import { Colors } from './SharedTypes';

    // ----------------------------------------------------------------------
    // |  Properties
    // ----------------------------------------------------------------------
    export let display_point_projections: boolean;
    export let display_velocity_extensions: boolean;
    export let frame_milliseconds: number;

    export let debug_mode: boolean = false;

    // ----------------------------------------------------------------------
    // |  State Management
    // ----------------------------------------------------------------------
    const _debug_colors = new Colors();

    let _framerate_error: boolean = false;

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    let _initialized = false;


    // Initialization
    $: {
        if(!_initialized) {
            const initialized = display_point_projections !== undefined;

            if(initialized) {
            }

            _initialized = initialized;
        }
    }

    // ----------------------------------------------------------------------
    function OnFramerate(event) {
        const value = (
            () => {
                if(!event.target.value)
                    return undefined;

                const value = Number(event.target.value);

                if(value <= 0)
                    return undefined;

                return value;
            }
        )();

        _framerate_error = value === undefined;

        if(!_framerate_error)
            frame_milliseconds = value;
    }

    // ----------------------------------------------------------------------

</script>

<!--
----------------------------------------------------------------------
|
|  Elements
|
----------------------------------------------------------------------
-->
<div
    class=settings
>
    {#if _initialized}
        <div
            class=cols
            style={debug_mode ? _debug_colors.Border() : ""}
        >
            <label class=single-line-checkbox>
                <input
                    type=checkbox
                    bind:checked={display_point_projections}
                >
                Display Point Projections
            </label>

            <label class=single-line-checkbox>
                <input
                    type=checkbox
                    bind:checked={display_velocity_extensions}
                >
                Display Velocity Extensions
            </label>

            <div>Animation Framerate Milliseconds</div>
            <input
                type=number
                min=1
                class={_framerate_error ? "error" : ""}
                value={frame_milliseconds}
                on:input={OnFramerate}
            />
        </div>
    {/if}
</div>

<!--
----------------------------------------------------------------------
|
|  Style
|
----------------------------------------------------------------------
-->
<style lang=sass>
    .settings
        @import './Variables.sass'
        @include content-info-mixin

        .cols
            @include content-info-grid-mixin(200px 91px)

            .single-line-checkbox
                grid-column: 1 / span 2

            .error
                background-color: red
</style>
