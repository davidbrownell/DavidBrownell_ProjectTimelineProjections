<!--
----------------------------------------------------------------------
|
|  Teams.svelte
|
|  David Brownell <db@DavidBrownell.com>
|      2022-02-05 12:14:00
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
    export let debug_mode: boolean = false;

    // ----------------------------------------------------------------------
    // |  State Management
    // ----------------------------------------------------------------------
    const _debug_colors = new Colors();

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    let _initialized = false;

    // Initialization
    $: {
        if(!_initialized) {
            const initialized = true; // TODO: display_point_projections !== undefined;

            if(initialized) {
            }

            _initialized = initialized;
        }
    }
</script>

<!--
----------------------------------------------------------------------
|
|  Elements
|
----------------------------------------------------------------------
-->
<div class=teams>
    {#if _initialized}
        <div
            style={debug_mode ? _debug_colors.Border() : ""}
        >
            Team-specific selection is not yet implemented
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
    .teams
        @import './Variables.sass'
        @include content-info-mixin

</style>
