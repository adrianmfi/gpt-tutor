package no.amefi.gpttutor.learningplan.repository;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "learning_plans")
public class LearningPlanEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "learningPlan", cascade = CascadeType.ALL)
    private List<LearningPlanItemEntity> learningPlanItems = new ArrayList<>();

    @OneToOne(mappedBy = "learningPlan", cascade = CascadeType.ALL)
    private LearningGoalsEntity learningGoals;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public List<LearningPlanItemEntity> getLearningPlanItems() {
        return learningPlanItems;
    }

    public void setLearningPlanItems(List<LearningPlanItemEntity> learningPlanItems) {
        this.learningPlanItems = learningPlanItems;
    }

    public LearningGoalsEntity getLearningGoals() {
        return learningGoals;
    }

    public void setLearningGoals(LearningGoalsEntity learningGoals) {
        this.learningGoals = learningGoals;
    }

}
