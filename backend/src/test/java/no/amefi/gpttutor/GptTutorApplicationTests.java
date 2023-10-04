package no.amefi.gpttutor;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import com.theokanning.openai.service.OpenAiService;

@SpringBootTest
class GptTutorApplicationTests {

	@MockBean
	private OpenAiService openAiService;

	@Test
	void contextLoads() {
	}

}
