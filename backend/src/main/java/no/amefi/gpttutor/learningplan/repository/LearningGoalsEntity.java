package no.amefi.gpttutor.learningplan.repository;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "learning_goals")
public class LearningGoalsEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_plan_id")
    private LearningPlanEntity learningPlan;

    private String targetLanguage;

    private Integer numberOfLessons;

    private String lessonDuration;

    private String targetLanguageLevel;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LearningPlanEntity getLearningPlan() {
        return learningPlan;
    }

    public void setLearningPlan(LearningPlanEntity learningPlan) {
        this.learningPlan = learningPlan;
    }

    public String getTargetLanguage() {
        return targetLanguage;
    }

    public void setTargetLanguage(String targetLanguage) {
        this.targetLanguage = targetLanguage;
    }

    public Integer getNumberOfLessons() {
        return numberOfLessons;
    }

    public void setNumberOfLessons(Integer numberOfLessons) {
        this.numberOfLessons = numberOfLessons;
    }

    public String getLessonDuration() {
        return lessonDuration;
    }

    public void setLessonDuration(String lessonDuration) {
        this.lessonDuration = lessonDuration;
    }

    public String gettargetLanguageLevel() {
        return targetLanguageLevel;
    }

    public void settargetLanguageLevel(String targetLanguageLevel) {
        this.targetLanguageLevel = targetLanguageLevel;
    }

}
