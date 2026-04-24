<?php
/**
 * Shortcode: [gds-diagnose]
 *
 * Renders the diagnostic widget inline. Default mode shows symptom chips
 * so users pick from a known-matching vocabulary. A toggle link reveals
 * a free-text input for descriptions that don't fit a chip.
 *
 *   [gds-diagnose heading="Having trouble?"]
 *
 * @package gds-chat
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function gds_chat_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'heading' => '',
		),
		$atts,
		'gds-diagnose'
	);

	$config = gds_chat_get_runtime_config();
	$heading = ! empty( $atts['heading'] ) ? $atts['heading'] : $config['heading'];

	gds_chat_enqueue_on_demand();

	static $instance = 0;
	$instance++;
	$id = 'gds-chat-' . $instance;

	ob_start();
	?>
	<div class="gds-widget" data-gds-instance="<?php echo esc_attr( $id ); ?>">
		<h2><?php echo esc_html( $heading ); ?></h2>

		<div class="gds-chips-view">
			<p class="lede"><?php esc_html_e( "Pick the closest match to what's happening:", 'gds-chat' ); ?></p>
			<div class="gds-chips" role="group" aria-label="<?php esc_attr_e( 'Common symptoms', 'gds-chat' ); ?>"></div>
			<button type="button" class="gds-toggle" data-gds-target="text">
				<?php esc_html_e( "Don't see it? Describe it in your own words →", 'gds-chat' ); ?>
			</button>
		</div>

		<div class="gds-text-view" hidden>
			<p class="lede"><?php esc_html_e( 'Describe what\'s happening in your own words:', 'gds-chat' ); ?></p>
			<textarea
				class="gds-input"
				placeholder="<?php echo esc_attr__( "My door opens fine but won't close all the way. Sometimes it reverses when it gets near the ground.", 'gds-chat' ); ?>"
				rows="4"
				aria-label="<?php esc_attr_e( 'Describe your garage door problem', 'gds-chat' ); ?>"
			></textarea>
			<div>
				<button type="button" class="gds-submit"><?php echo esc_html( $config['cta'] ); ?></button>
			</div>
			<div>
				<button type="button" class="gds-toggle" data-gds-target="chips">
					<?php esc_html_e( '← Pick from common symptoms instead', 'gds-chat' ); ?>
				</button>
			</div>
		</div>

		<div class="gds-results" role="region" aria-live="polite"></div>
		<p class="gds-footer">
			<?php
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
