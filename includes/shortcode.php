<?php
/**
 * Shortcode: [gds-diagnose]
 *
 * Renders the diagnostic widget inline. Supports attribute overrides so
 * editors can tune per-page copy without visiting the settings screen.
 *
 *   [gds-diagnose heading="Having trouble?" cta="Check my door"]
 *
 * @package gds-chat
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Render the widget.
 *
 * @param array $atts Shortcode attributes.
 * @return string HTML output.
 */
function gds_chat_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'heading' => '',
			'lede'    => '',
			'cta'     => '',
		),
		$atts,
		'gds-diagnose'
	);

	// Attribute overrides win over the stored settings; fall back to the
	// runtime config (which already pulls from options + applies filters).
	$config = gds_chat_get_runtime_config();
	$heading = ! empty( $atts['heading'] ) ? $atts['heading'] : $config['heading'];
	$lede    = ! empty( $atts['lede'] ) ? $atts['lede'] : $config['lede'];
	$cta     = ! empty( $atts['cta'] ) ? $atts['cta'] : $config['cta'];

	gds_chat_enqueue_on_demand();

	// Unique instance id so multiple widgets on one page don't collide.
	static $instance = 0;
	$instance++;
	$id = 'gds-chat-' . $instance;

	ob_start();
	?>
	<div class="gds-widget" data-gds-instance="<?php echo esc_attr( $id ); ?>">
		<h2><?php echo esc_html( $heading ); ?></h2>
		<p class="lede"><?php echo esc_html( $lede ); ?></p>
		<textarea
			class="gds-input"
			placeholder="<?php echo esc_attr__( "My door opens fine but won't close all the way. Sometimes it reverses when it gets near the ground.", 'gds-chat' ); ?>"
			rows="4"
			aria-label="<?php echo esc_attr__( 'Describe your garage door problem', 'gds-chat' ); ?>"
		></textarea>
		<button type="button" class="gds-submit"><?php echo esc_html( $cta ); ?></button>
		<div class="gds-results" role="region" aria-live="polite"></div>
		<p class="gds-footer">
			<?php
			// Footer with hyperlink to gds.
			printf(
				/* translators: %s: link to garagedoorscience.com */
				esc_html__( 'Powered by %s', 'gds-chat' ),
				'<a href="https://garagedoorscience.com" target="_blank" rel="noopener">garagedoorscience.com</a>'
			);
			?>
		</p>
	</div>
	<?php
	return (string) ob_get_clean();
}
add_shortcode( 'gds-diagnose', 'gds_chat_shortcode' );
