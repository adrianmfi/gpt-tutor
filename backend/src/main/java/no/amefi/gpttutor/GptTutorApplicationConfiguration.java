package no.amefi.gpttutor;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.theokanning.openai.service.OpenAiService;

@Configuration
public class GptTutorApplicationConfiguration {

	@Bean
	public OpenAiService openAiService(
			@Value("${OPENAI_API_KEY}") String openAiApiKey) {
		return new OpenAiService(openAiApiKey, Duration.ofMinutes(1));

	}
}
